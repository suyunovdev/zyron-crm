import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth, attendanceWindow } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { pushToParent } from '@/lib/tg-notify';
import { escapeHtml } from '@/lib/telegram';

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
    include: { group: { select: { teacherId: true, name: true } } },
  });

  if (!lesson || lesson.group.teacherId !== auth.id) {
    return NextResponse.json({ error: 'Bu dars sizga tegishli emas' }, { status: 403 });
  }

  // IDOR himoyasi (K-5/K-7): o'quvchi AYNAN shu darsning guruhiga a'zo bo'lishi shart.
  // Aks holda ustoz begona (hatto boshqa filial) o'quvchi uchun soxta davomat yozib
  // o'z oyligini shishirishi va begona ota-onaga soxta "darsga kelmadi" xabari yuborishi mumkin.
  const isMember = await prisma.groupStudent.findFirst({
    where: { groupId: lesson.groupId, studentId },
    select: { studentId: true },
  });
  if (!isMember) {
    return NextResponse.json({ error: 'O\'quvchi bu guruh a\'zosi emas' }, { status: 403 });
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

  // Avto-push: farzand kelmagan bo'lsa ota-onaga Telegram xabar (fire-and-forget)
  if (!present) {
    void (async () => {
      const student = await prisma.user.findUnique({ where: { id: studentId }, select: { name: true } });
      const name = escapeHtml(student?.name || 'Farzandingiz');
      await pushToParent(studentId, `❗️ <b>${name}</b> bugungi darsga kelmadi (${escapeHtml(lesson.group.name)}).`);
    })();
  }

  return NextResponse.json(attendance);
}
