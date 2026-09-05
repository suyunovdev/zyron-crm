import { prisma } from '@/lib/db';
import { todayTz } from '@/lib/date';
import { perLessonRate } from '@/lib/billing-core';
import { generateLessons } from '@/lib/generate-lessons';
import { logger } from '@/lib/logger';

// Guruh sozlamasi o'zgarganда darslarni moslashtiruvchi YAGONA joy.
// Guruh PATCH shu funksiyani chaqiradi; diagnostika CLI ham (dryRun/fix) shuni ishlatadi.
// Qoidalar (yagona ta'rif):
//  - "Kelajak" = scheduledDate >= today; o'tgan darslar DOIM muzlab qoladi.
//  - Himoyalangan dars (o'tgan YOKI davomatli) hech qachon o'chirilmaydi va narxi qayta bosilmaydi.

export interface GroupConfigChange {
  dayType?: string;
  time?: string | null;
  duration?: string;
  price?: number;
  lessonsPerMonth?: number;
  startDate?: string | null;
}

export interface ReconcileReport {
  today: string;
  timeUpdated: number;
  durationUpdated: number;
  rateUpdated: number;
  deleted: number;
  regenerated: number;
  warnings: string[];
}

export async function reconcileFutureLessons(
  groupId: string,
  change: GroupConfigChange,
  opts: { today?: string; dryRun?: boolean } = {},
): Promise<ReconcileReport> {
  const today = opts.today ?? todayTz();
  const dryRun = opts.dryRun ?? false;
  const report: ReconcileReport = {
    today, timeUpdated: 0, durationUpdated: 0, rateUpdated: 0, deleted: 0, regenerated: 0, warnings: [],
  };

  const futureWhere = { groupId, scheduledDate: { gte: today } } as const;
  const futureUnattended = { ...futureWhere, attendances: { none: {} } } as const;

  // 1) Dars kunlari (dayType) o'zgarsa — kelajakdagi davomatsiz darslarni yangi kunlarga
  //    qayta yaratamiz. generateLessons vaqt/davomiylik/narxni guruhdan oladi (yangilangan).
  if (change.dayType !== undefined) {
    if (change.dayType === 'toq' || change.dayType === 'juft') {
      if (dryRun) {
        report.deleted = await prisma.lesson.count({ where: futureUnattended });
      } else {
        report.deleted = (await prisma.lesson.deleteMany({ where: futureUnattended })).count;
        try {
          report.regenerated = (await generateLessons({ groupId, startDate: today, months: 12, dayType: change.dayType })).created;
        } catch (e) {
          logger.error('[reconcile] qayta yaratish', e);
          report.warnings.push('Darslarni qayta yaratishда xato');
        }
      }
      // Qayta yaratish vaqt/davomiylik/narxni ham to'g'ri qo'yadi → qolgan qadamlar shart emas.
      return report;
    }
    report.warnings.push(`dayType="${change.dayType}" — avtomatik jadval yaratilmaydi (maxsus jadval, darslarni qo'lda kiriting)`);
  }

  // 2) Dars vaqti o'zgarsa — kelajak darslar scheduledTime
  if (change.time) {
    if (dryRun) {
      report.timeUpdated = await prisma.lesson.count({ where: { ...futureWhere, scheduledTime: { not: change.time } } });
    } else {
      report.timeUpdated = (await prisma.lesson.updateMany({ where: futureWhere, data: { scheduledTime: change.time } })).count;
    }
  }

  // 3) Davomiylik o'zgarsa — kelajak darslar duration
  if (change.duration !== undefined) {
    if (dryRun) {
      report.durationUpdated = await prisma.lesson.count({ where: { ...futureWhere, duration: { not: change.duration } } });
    } else {
      report.durationUpdated = (await prisma.lesson.updateMany({ where: futureWhere, data: { duration: change.duration } })).count;
    }
  }

  // 4) Narx / oyiga darslar o'zgarsa — kelajakdagi DAVOMATSIZ darslar perLessonRate'ini qayta bosish.
  //    O'tgan va davomatli darslar muzlab qoladi (billing yaxlitligi).
  if (change.price !== undefined || change.lessonsPerMonth !== undefined) {
    const g = await prisma.group.findUnique({ where: { id: groupId }, select: { price: true, lessonsPerMonth: true } });
    if (g) {
      const rate = perLessonRate(change.price ?? g.price, change.lessonsPerMonth ?? g.lessonsPerMonth);
      if (dryRun) {
        report.rateUpdated = await prisma.lesson.count({ where: { ...futureUnattended, perLessonRate: { not: rate } } });
      } else {
        report.rateUpdated = (await prisma.lesson.updateMany({ where: futureUnattended, data: { perLessonRate: rate } })).count;
      }
    }
  }

  // 5) startDate — v1: avtomatik siljitilmaydi (davomatni yetim qoldirmaslik uchun)
  if (change.startDate !== undefined) {
    report.warnings.push('startDate o\'zgardi — mavjud darslar avtomatik siljitilmadi (v1); kerak bo\'lsa qo\'lda qayta generatsiya qiling.');
  }

  return report;
}
