import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { attendanceWindow } from '@/lib/api-utils';
import { getSetting } from '@/lib/settings';

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

  // Superadmin sozlamasi: avtomatik davomat o'chirilgan bo'lsa — hech kimni belgilamaymiz.
  // Fail-safe: faqat aniq 'false' o'chiradi (sozlama yo'q/default bo'lsa yoqiq qoladi).
  if ((await getSetting('autoAbsentEnabled')) === 'false') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'disabled' });
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
          // F2-5: o'quvchi holati (frozen/archived absent olmasin) va qo'shilgan sanasi kerak
          students: { select: { studentId: true, joinedAt: true, student: { select: { status: true } } } },
        },
      },
      attendances: { select: { studentId: true } },
    },
  });

  let totalMarked = 0;

  for (const lesson of lessons) {
    // Muhlat: dars tugagach 2 soat (attendanceWindow). Shu vaqtgacha teacher o'zi belgilaydi.
    const { windowEnd } = attendanceWindow(lesson.scheduledDate, lesson.scheduledTime, lesson.duration);

    // Muhlat hali tugamagan bo'lsa — o'tkazib yuboramiz
    if (now <= windowEnd) continue;

    // Belgilanmagan o'quvchilar, biznes-qoidalar bilan (F2-5):
    //  - faqat FAOL o'quvchi (frozen/archived muzlatilgan — absent yozilmaydi);
    //  - faqat o'quvchi guruhga QO'SHILGANIDAN keyingi darslar (joinedAt dan oldingisiga emas).
    const markedIds = new Set(lesson.attendances.map(a => a.studentId));
    const toMark = lesson.group.students.filter(gs => {
      if (markedIds.has(gs.studentId)) return false;
      if (gs.student.status !== 'active') return false;
      const joinedStr = fmt(new Date(gs.joinedAt.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' })));
      if (lesson.scheduledDate < joinedStr) return false;
      return true;
    });

    // Absent yozish. Bitta P2002 (poyga — teacher/admin bir vaqtda belgilagan) butun
    // cronni to'xtatmasin — har o'quvchi alohida try/catch bilan (SQLite skipDuplicates yo'q).
    for (const gs of toMark) {
      try {
        await prisma.attendance.create({
          data: { lessonId: lesson.id, studentId: gs.studentId, present: false },
        });
        totalMarked++;
      } catch (e) {
        if (!(e && typeof e === 'object' && (e as { code?: string }).code === 'P2002')) throw e;
        // P2002: allaqachon belgilangan (poyga) — o'tkazib yuboramiz
      }
    }
  }

  return NextResponse.json({
    ok: true,
    date: todayStr,
    lessonsChecked: lessons.length,
    autoAbsent: totalMarked,
  });
}
