import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Cron endpoint: belgilanmagan o'quvchilarni avtomatik "absent" qiladi.
// Muhlat teacher davomat oynasi bilan mos: dars kuni oxiri (ertasi 00:00)
// tugagachgina belgilanadi — shu vaqtgacha teacher esdan chiqqan davomatni
// o'zi belgilay oladi. Har 30 daqiqada ishga tushiriladi.
export async function GET(req: NextRequest) {
  // Sekret header orqali auth. CRON_SECRET faqat env'dan olinadi —
  // sozlanmagan bo'lsa endpoint ochiq qolmasligi uchun to'xtatiladi.
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET sozlanmagan' }, { status: 500 });
  }
  const secret = req.headers.get('x-cron-secret');
  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const todayStr = fmt(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = fmt(yesterday);

  // Kecha va bugungi darslar (yarim tundan keyin kechagi kun ham finalize bo'lsin)
  const lessons = await prisma.lesson.findMany({
    where: { scheduledDate: { in: [yesterdayStr, todayStr] } },
    include: {
      group: {
        include: {
          students: { select: { studentId: true } },
        },
      },
      attendances: { select: { studentId: true } },
    },
  });

  let totalMarked = 0;

  for (const lesson of lessons) {
    // Muhlat: dars kuni oxiri (ertasi kun 00:00). Shu vaqtgacha teacher o'zi belgilaydi.
    const [y, m, d] = lesson.scheduledDate.split('-').map(Number);
    const dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0);

    // Muhlat hali tugamagan bo'lsa — o'tkazib yuboramiz
    if (now < dayEnd) continue;

    // Find students without attendance records
    const markedIds = new Set(lesson.attendances.map(a => a.studentId));
    const unmarked = lesson.group.students.filter(gs => !markedIds.has(gs.studentId));

    // Mark all unmarked students as absent
    for (const gs of unmarked) {
      await prisma.attendance.create({
        data: {
          lessonId: lesson.id,
          studentId: gs.studentId,
          present: false,
        },
      });
      totalMarked++;
    }
  }

  return NextResponse.json({
    ok: true,
    date: todayStr,
    lessonsChecked: lessons.length,
    autoAbsent: totalMarked,
  });
}
