import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

// Teacher writes lesson topic
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth('teacher');
  if (auth instanceof NextResponse) return auth;

  const { lessonId, topic } = await req.json();
  if (!lessonId || !topic) {
    return NextResponse.json({ error: 'lessonId va topic kerak' }, { status: 400 });
  }

  // Verify this lesson belongs to teacher's group
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { group: { select: { teacherId: true } } },
  });

  if (!lesson || lesson.group.teacherId !== auth.id) {
    return NextResponse.json({ error: 'Bu dars sizga tegishli emas' }, { status: 403 });
  }

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: { topic },
  });

  return NextResponse.json(updated);
}
