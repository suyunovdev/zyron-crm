import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { checkDropout } from '@/lib/attendance-guard';
import { logger } from '@/lib/logger';
import { scopedBranchId } from '@/lib/branch-scope';
import { isLessonDay } from '@/lib/schedule';
import { logAudit } from '@/lib/audit';
import type { SessionUser } from '@/lib/auth';

// present MAJBURIY boolean (string "false" kabi truthy qiymatlar rad etiladi — teacher endpoint bilan bir xil)
const AttendanceSchema = z.object({
  lessonId: z.string().optional(),
  studentId: z.string().min(1),
  present: z.boolean(),
  groupId: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  scoreAttend: z.coerce.number().int().min(0).max(5).optional(),
  scoreHomework: z.coerce.number().int().min(0).max(5).optional(),
  scoreActivity: z.coerce.number().int().min(0).max(5).optional(),
});

// Admin davomat tuzatishini audit jurnaliga yozadi (javobgarlik).
async function auditAttendance(auth: SessionUser, studentId: string, present: boolean) {
  const s = await prisma.user.findUnique({ where: { id: studentId }, select: { name: true } });
  await logAudit(auth, 'update', 'attendance', studentId, `Davomat tuzatildi: ${s?.name || studentId} — ${present ? 'keldi' : 'kelmadi'}`);
}

// Admin can modify attendance
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;

    const parsed = await parseBody(req, AttendanceSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { lessonId, studentId, present, groupId, date, time, scoreAttend, scoreHomework, scoreActivity } = parsed;

    // Filial cheklovi: boshqa filial o'quvchisi davomatini o'zgartirib bo'lmaydi
    const bId = await scopedBranchId(auth);
    if (bId && studentId) {
      const s = await prisma.user.findUnique({ where: { id: studentId }, select: { branchId: true } });
      if (!s || s.branchId !== bId) return NextResponse.json({ error: 'O\'quvchi boshqa filialga tegishli' }, { status: 403 });
    }

    // 0-5 oralig'iga cheklangan ballar (berilganlarigina)
    const clamp = (v: number) => Math.min(5, Math.max(0, Number(v)));
    const scores: Record<string, number> = {};
    if (scoreAttend !== undefined) scores.scoreAttend = clamp(scoreAttend);
    if (scoreHomework !== undefined) scores.scoreHomework = clamp(scoreHomework);
    if (scoreActivity !== undefined) scores.scoreActivity = clamp(scoreActivity);

    // Direct lessonId mode
    if (lessonId && studentId && present !== undefined) {
      const attendance = await prisma.attendance.upsert({
        where: { lessonId_studentId: { lessonId, studentId } },
        update: { present, ...scores, markedAt: new Date() },
        create: { lessonId, studentId, present, ...scores },
      });
      if (!present) {
        const l = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { groupId: true } });
        if (l) await checkDropout(studentId, l.groupId, auth);
      }
      await auditAttendance(auth, studentId, present);
      return NextResponse.json(attendance);
    }

    // Date-based mode: find or create lesson, then mark attendance
    if (groupId && studentId && date && present !== undefined) {
      let lesson = await prisma.lesson.findFirst({
        where: { groupId, scheduledDate: date },
      });

      if (!lesson) {
        // Yangi dars yaratishdan oldin: sana guruh jadvaliga (dayType) mos dars kunimi?
        const group = await prisma.group.findUnique({
          where: { id: groupId },
          select: { time: true, dayType: true },
        });
        if (!isLessonDay(group?.dayType, date)) {
          return NextResponse.json(
            { error: 'Bu kun guruh jadvaliga to\'g\'ri kelmaydi — dars kuni emas. Davomat faqat dars kunlariga belgilanadi.' },
            { status: 400 },
          );
        }
        const lessonCount = await prisma.lesson.count({ where: { groupId } });
        try {
          lesson = await prisma.lesson.create({
            data: {
              groupId,
              scheduledDate: date,
              scheduledTime: time || group?.time || '00:00',
              order: lessonCount + 1,
            },
          });
        } catch {
          // Race: boshqa so'rov shu darsni yaratib ulgurdi (unique constraint) — qayta o'qiymiz
          lesson = await prisma.lesson.findFirst({ where: { groupId, scheduledDate: date } });
          if (!lesson) throw new Error('Dars yaratib bo\'lmadi');
        }
      }

      const attendance = await prisma.attendance.upsert({
        where: { lessonId_studentId: { lessonId: lesson.id, studentId } },
        update: { present, ...scores, markedAt: new Date() },
        create: { lessonId: lesson.id, studentId, present, ...scores },
      });
      if (!present) await checkDropout(studentId, groupId, auth);
      await auditAttendance(auth, studentId, present);
      return NextResponse.json(attendance);
    }

    return NextResponse.json({ error: 'Parametrlar yetarli emas' }, { status: 400 });
  } catch (error) {
    logger.error('[PATCH /api/admin/attendance]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// Delete attendance record
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;

    const { lessonId, studentId } = await req.json();
    if (!lessonId || !studentId) {
      return NextResponse.json({ error: 'lessonId va studentId kerak' }, { status: 400 });
    }

    // Filial cheklovi: boshqa filial o'quvchisi davomatini o'chirib bo'lmaydi
    const bId = await scopedBranchId(auth);
    if (bId) {
      const s = await prisma.user.findUnique({ where: { id: studentId }, select: { branchId: true } });
      if (!s || s.branchId !== bId) return NextResponse.json({ error: 'O\'quvchi boshqa filialga tegishli' }, { status: 403 });
    }

    await prisma.attendance.delete({
      where: { lessonId_studentId: { lessonId, studentId } },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[DELETE /api/admin/attendance]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
