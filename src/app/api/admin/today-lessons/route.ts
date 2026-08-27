import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { scopedBranchId } from '@/lib/branch-scope';
import { todayTz } from '@/lib/date';
import { logger } from '@/lib/logger';

// Bugungi darslar — markaz bo'yicha (admin: o'z filiali + filialsiz; superadmin: hammasi).
// Faqat faol guruhlar. Dashboard «Bugungi darslar» kartasi shundan foydalanadi.
export async function GET() {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;

    const today = todayTz();
    const bId = await scopedBranchId(auth); // superadmin → null
    const isSuper = auth.role === 'superadmin';

    const lessons = await prisma.lesson.findMany({
      where: {
        scheduledDate: today,
        group: { status: 'active', ...(bId ? { OR: [{ branchId: bId }, { branchId: null }] } : {}) },
      },
      orderBy: [{ scheduledTime: 'asc' }, { order: 'asc' }],
      include: {
        group: {
          select: {
            id: true, name: true, subject: true, room: true, time: true,
            teacher: { select: { name: true } },
            branch: { select: { name: true } },
            _count: { select: { students: true } },
          },
        },
        attendances: { select: { present: true } },
      },
    });

    const items = lessons.map(l => ({
      id: l.id,
      groupId: l.groupId,
      time: l.scheduledTime || l.group.time || '',
      order: l.order,
      groupName: l.group.name,
      subject: l.group.subject,
      teacherName: l.group.teacher?.name || null,
      room: l.group.room || null,
      branchName: isSuper ? (l.group.branch?.name || null) : null,
      studentCount: l.group._count.students,
      marked: l.attendances.length,
      present: l.attendances.filter(a => a.present).length,
    }));

    return NextResponse.json({ date: today, lessons: items });
  } catch (error) {
    logger.error('[GET /api/admin/today-lessons]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
