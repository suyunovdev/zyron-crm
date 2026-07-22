import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getTodayUz } from '@/lib/api-utils';

// Teacher marks attendance — allowed for today's lessons and past lessons
export async function POST(req: NextRequest) {
  const auth = await requireAuth('teacher');
  if (auth instanceof NextResponse) return auth;

  const { lessonId, studentId, present, scoreAttend, scoreHomework, scoreActivity } = await req.json();
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

  // Dars boshlanishidan 15 min oldindan boshlab belgilash mumkin.
  // Keyingi vaqt cheklovi yo'q — teacher xato davomatni keyin ham tuzata oladi.
  // (Kelajakdagi darsni oldindan belgilab qo'yish taqiqlanadi.)
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const [ly, lm, ld] = lesson.scheduledDate.split('-').map(Number);
  const [lh, lmin] = lesson.scheduledTime.split(':').map(Number);
  const lessonStart = new Date(ly, lm - 1, ld, lh, lmin);
  const windowStart = new Date(lessonStart.getTime() - 15 * 60000); // 15 min oldin

  if (now < windowStart) {
    return NextResponse.json({ error: 'Dars hali boshlanmagan — davomatni oldindan belgilab bo\'lmaydi' }, { status: 400 });
  }

  const scores: Record<string, number> = {};
  if (scoreAttend !== undefined) scores.scoreAttend = Math.min(5, Math.max(0, Number(scoreAttend)));
  if (scoreHomework !== undefined) scores.scoreHomework = Math.min(5, Math.max(0, Number(scoreHomework)));
  if (scoreActivity !== undefined) scores.scoreActivity = Math.min(5, Math.max(0, Number(scoreActivity)));

  const attendance = await prisma.attendance.upsert({
    where: { lessonId_studentId: { lessonId, studentId } },
    update: { present, ...scores, markedAt: new Date() },
    create: { lessonId, studentId, present, ...scores },
  });

  return NextResponse.json(attendance);
}
