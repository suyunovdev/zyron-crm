import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { checkDropout } from '@/lib/attendance-guard';
import { logger } from '@/lib/logger';

// Admin can modify attendance
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;

    const { lessonId, studentId, present, groupId, date, time, scoreAttend, scoreHomework, scoreActivity } = await req.json();

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
      return NextResponse.json(attendance);
    }

    // Date-based mode: find or create lesson, then mark attendance
    if (groupId && studentId && date && present !== undefined) {
      let lesson = await prisma.lesson.findFirst({
        where: { groupId, scheduledDate: date },
      });

      if (!lesson) {
        // Soxta '00:00' o'rniga guruhning haqiqiy vaqtidan foydalanamiz
        const group = await prisma.group.findUnique({
          where: { id: groupId },
          select: { time: true },
        });
        const lessonCount = await prisma.lesson.count({ where: { groupId } });
        lesson = await prisma.lesson.create({
          data: {
            groupId,
            scheduledDate: date,
            scheduledTime: time || group?.time || '00:00',
            order: lessonCount + 1,
          },
        });
      }

      const attendance = await prisma.attendance.upsert({
        where: { lessonId_studentId: { lessonId: lesson.id, studentId } },
        update: { present, ...scores, markedAt: new Date() },
        create: { lessonId: lesson.id, studentId, present, ...scores },
      });
      if (!present) await checkDropout(studentId, groupId, auth);
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

    await prisma.attendance.delete({
      where: { lessonId_studentId: { lessonId, studentId } },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[DELETE /api/admin/attendance]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
