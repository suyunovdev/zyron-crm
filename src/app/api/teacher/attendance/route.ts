import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, attendanceWindow } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';

const score = z.coerce.number().int().min(0).max(5).optional();
const AttendanceSchema = z.object({
  lessonId: z.string().min(1),
  studentId: z.string().min(1),
  present: z.boolean(),
  scoreAttend: score,
  scoreHomework: score,
  scoreActivity: score,
});

// Teacher marks attendance — allowed for today's lessons and past lessons
export async function POST(req: NextRequest) {
  const auth = await requireAuth('teacher');
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(req, AttendanceSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { lessonId, studentId, present, scoreAttend, scoreHomework, scoreActivity } = parsed;

  // Verify lesson belongs to teacher's group
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { group: { select: { teacherId: true } } },
  });

  if (!lesson || lesson.group.teacherId !== auth.id) {
    return NextResponse.json({ error: 'Bu dars sizga tegishli emas' }, { status: 403 });
  }

  // Davomat belgilash oynasi (sof mantiq api-utils'da — test qilinadi):
  //  - dars boshlanishidan 15 min oldindan (kelajakni oldindan belgilab bo'lmaydi);
  //  - dars kuni oxirigacha (ertasi 00:00) — esdan chiqqan davomat uchun muhlat.
  //    Muhlatdan keyin faqat admin tuzata oladi.
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const { windowStart, dayEnd } = attendanceWindow(lesson.scheduledDate, lesson.scheduledTime);

  if (now < windowStart) {
    return NextResponse.json({ error: 'Dars hali boshlanmagan — davomatni oldindan belgilab bo\'lmaydi' }, { status: 400 });
  }
  if (now >= dayEnd) {
    return NextResponse.json({ error: 'Davomat muhlati tugagan (dars kuni oxirigacha). Tuzatish uchun admin bilan bog\'laning' }, { status: 400 });
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
