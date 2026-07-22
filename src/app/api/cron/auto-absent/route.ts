import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Cron endpoint: automatically mark unmarked students as absent
// after lesson time window closes (lesson end + 15 min)
// Called by system cron every 30 minutes
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
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Find today's lessons
  const lessons = await prisma.lesson.findMany({
    where: { scheduledDate: todayStr },
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
    // Check if lesson window has closed
    const [y, m, d] = lesson.scheduledDate.split('-').map(Number);
    const [h, min] = lesson.scheduledTime.split(':').map(Number);
    const start = new Date(y, m - 1, d, h, min);
    const dur = parseFloat(lesson.duration.match(/[\d.]+/)?.[0] || '1.5');
    const end = new Date(start.getTime() + dur * 3600000);
    const windowEnd = new Date(end.getTime() + 15 * 60000);

    // Skip if lesson window hasn't closed yet
    if (now <= windowEnd) continue;

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
