// Ma'lumot yaxlitligi tekshiruvi (SOF logika — prisma inyeksiya qilinadi).
// Guruh sozlamasi ↔ dars qatorlari "drift"ini va probelli ismlarni aniqlaydi.
// DIQQAT: bu modul auth/db import QILMAYDI (CLI JWT_SECRET'siz ishlashi uchun) —
// faqat sof helperlar: computeLessonDates, isLessonDay, perLessonRate, lessonDefaultsFromGroup.

import type { PrismaClient } from '@prisma/client';
import { computeLessonDates, isLessonDay } from '@/lib/schedule';
import { perLessonRate } from '@/lib/billing-core';
import { lessonDefaultsFromGroup } from '@/lib/lesson-fields';

export interface GroupIssue {
  groupId: string;
  groupName: string;
  teacherName: string;
  kinds: {
    timeMismatch: number;      // kelajak darslar guruh vaqtiga mos emas
    wrongDayLessons: number;   // jadvalga to'g'ri kelmaydigan kunlardagi kelajak darslar
    missingDays: number;       // keyingi 1 oyda yetishmayotgan jadval-kun darslari
    durationMismatch: number;  // kelajak darslar davomiyligi mos emas
    rateDrift: number;         // kelajak (davomatsiz) darslar narx snapshot'i joriy narxdan farqli
    branchNull: boolean;       // guruh filialsiz
  };
}

export interface IntegrityReport {
  today: string;
  groups: GroupIssue[];       // faqat muammoli guruhlar
  dirtyNames: { id: string; name: string }[];
  groupsChecked: number;
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ');

export async function checkIntegrity(prisma: PrismaClient, today: string): Promise<IntegrityReport> {
  const groups = await prisma.group.findMany({
    where: { status: 'active' },
    select: {
      id: true, name: true, dayType: true, time: true, duration: true,
      price: true, lessonsPerMonth: true, branchId: true,
      teacher: { select: { name: true } },
      lessons: {
        where: { scheduledDate: { gte: today } },
        select: { scheduledDate: true, scheduledTime: true, duration: true, perLessonRate: true, _count: { select: { attendances: true } } },
      },
    },
  });

  const issues: GroupIssue[] = [];
  for (const g of groups) {
    const fields = lessonDefaultsFromGroup(g);
    const currentRate = perLessonRate(g.price, g.lessonsPerMonth);
    const future = g.lessons;

    let timeMismatch = 0, wrongDayLessons = 0, durationMismatch = 0, rateDrift = 0;
    for (const l of future) {
      if (l.scheduledTime !== fields.scheduledTime) timeMismatch++;
      if (!isLessonDay(g.dayType, l.scheduledDate)) wrongDayLessons++;
      if (l.duration !== g.duration) durationMismatch++;
      // Narx drifti: 1 so'mdan katta farq (float shovqinini emas — billing baribir yaxlitlaydi)
      if (l._count.attendances === 0 && l.perLessonRate != null && Math.abs(l.perLessonRate - currentRate) > 1) rateDrift++;
    }

    // Yetishmayotgan jadval-kun darslari (keyingi 1 oy) — faqat toq/juft
    let missingDays = 0;
    if (g.dayType === 'toq' || g.dayType === 'juft') {
      const expected = computeLessonDates({ startDate: today, dayType: g.dayType, months: 1 });
      const have = new Set(future.map(l => l.scheduledDate));
      missingDays = expected.filter(d => !have.has(d)).length;
    }

    const branchNull = g.branchId == null;
    if (timeMismatch || wrongDayLessons || missingDays || durationMismatch || rateDrift || branchNull) {
      issues.push({
        groupId: g.id, groupName: g.name, teacherName: g.teacher?.name ?? '-',
        kinds: { timeMismatch, wrongDayLessons, missingDays, durationMismatch, rateDrift, branchNull },
      });
    }
  }

  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const dirtyNames = users.filter(u => u.name !== norm(u.name)).map(u => ({ id: u.id, name: u.name }));

  return { today, groups: issues, dirtyNames, groupsChecked: groups.length };
}
