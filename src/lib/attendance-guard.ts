import { prisma } from '@/lib/db';
import { computeBillable, ABSENCE_GRACE } from '@/lib/billing';
import { createNotification } from '@/lib/notify';
import { logAudit } from '@/lib/audit';
import type { SessionUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * O'quvchining berilgan guruhdagi trailing (oxirgi) sababsiz yo'qlik ketma-ketligini
 * tekshiradi. > ABSENCE_GRACE bo'lsa va o'quvchi hozir aktiv bo'lsa — avto-muzlatadi,
 * adminga bildirishnoma + Note + (actor bo'lsa) audit yozadi.
 * Idempotent: faqat aktiv o'quvchini muzlatadi (qayta muzlatmaydi).
 * Xato bo'lsa asosiy davomat amalini bloklamaydi.
 */
export async function checkDropout(studentId: string, groupId: string, actor?: SessionUser): Promise<void> {
  try {
    const records = await prisma.attendance.findMany({
      where: { studentId, lesson: { groupId } },
      select: { present: true, lesson: { select: { scheduledDate: true, order: true } } },
      orderBy: [{ lesson: { scheduledDate: 'asc' } }, { lesson: { order: 'asc' } }],
    });
    const { currentAbsenceStreak } = computeBillable(
      records.map(r => ({ scheduledDate: r.lesson.scheduledDate, present: r.present })),
    );
    if (currentAbsenceStreak <= ABSENCE_GRACE) return;

    const student = await prisma.user.findUnique({ where: { id: studentId }, select: { name: true, status: true, branchId: true } });
    if (!student || student.status !== 'active') return; // faqat aktivni muzlatamiz

    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
    const groupName = group?.name || 'guruh';

    await prisma.user.update({ where: { id: studentId }, data: { status: 'frozen' } });
    await prisma.note.create({
      data: { studentId, type: 'frozen', text: `Avtomatik: sababsiz ${currentAbsenceStreak} ketma-ket yo'qlik — ${groupName}` },
    });
    await createNotification({
      type: 'attendance',
      title: 'O\'quvchi avto-muzlatildi',
      message: `${student.name} — ${groupName}da ${currentAbsenceStreak} ketma-ket sababsiz yo'qlik`,
      link: `/dashboard/admin/students/${studentId}`,
      branchId: student.branchId,
    });
    if (actor) {
      await logAudit(actor, 'auto-freeze', 'user', studentId,
        `${student.name} avto-muzlatildi (>${ABSENCE_GRACE} sababsiz yo'qlik, ${groupName})`);
    }
  } catch (e) {
    logger.error('[checkDropout] xato', e, { studentId, groupId });
  }
}
