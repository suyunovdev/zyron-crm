import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

// Admin can modify attendance
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;

    const { lessonId, studentId, present, groupId, date, time } = await req.json();

    // Direct lessonId mode
    if (lessonId && studentId && present !== undefined) {
      const attendance = await prisma.attendance.upsert({
        where: { lessonId_studentId: { lessonId, studentId } },
        update: { present, markedAt: new Date() },
        create: { lessonId, studentId, present },
      });
      return NextResponse.json(attendance);
    }

    // Date-based mode: find or create lesson, then mark attendance
    if (groupId && studentId && date && present !== undefined) {
      let lesson = await prisma.lesson.findFirst({
        where: { groupId, scheduledDate: date },
      });

      if (!lesson) {
        const lessonCount = await prisma.lesson.count({ where: { groupId } });
        lesson = await prisma.lesson.create({
          data: {
            groupId,
            scheduledDate: date,
            scheduledTime: time || '00:00',
            order: lessonCount + 1,
          },
        });
      }

      const attendance = await prisma.attendance.upsert({
        where: { lessonId_studentId: { lessonId: lesson.id, studentId } },
        update: { present, markedAt: new Date() },
        create: { lessonId: lesson.id, studentId, present },
      });
      return NextResponse.json(attendance);
    }

    return NextResponse.json({ error: 'Parametrlar yetarli emas' }, { status: 400 });
  } catch (error) {
    console.error('[PATCH /api/admin/attendance]', error);
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
    console.error('[DELETE /api/admin/attendance]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
