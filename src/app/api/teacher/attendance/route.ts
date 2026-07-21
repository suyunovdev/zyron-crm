import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

// Teacher marks attendance — allowed for today's lessons and past lessons
export async function POST(req: NextRequest) {
  const auth = await requireAuth('teacher');
  if (auth instanceof NextResponse) return auth;

  const { lessonId, studentId, present } = await req.json();
  if (!lessonId || !studentId || present === undefined) {
    return NextResponse.json({ error: 'lessonId, studentId va present kerak' }, { status: 400 });
  }

  // Verify lesson belongs to teacher's group
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { group: { select: { teacherId: true } } },
  });

  if (!lesson || lesson.group.teacherId !== auth.id) {
    return NextResponse.json({ error: 'Bu dars sizga tegishli emas' }, { status: 403 });
  }

  // Allow marking for today and past lessons (not future)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (lesson.scheduledDate > todayStr) {
    return NextResponse.json({ error: 'Kelajakdagi darsga davomat belgilab bo\'lmaydi' }, { status: 400 });
  }

  const attendance = await prisma.attendance.upsert({
    where: { lessonId_studentId: { lessonId, studentId } },
    update: { present, markedAt: new Date() },
    create: { lessonId, studentId, present },
  });

  return NextResponse.json(attendance);
}
