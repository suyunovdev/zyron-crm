import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { generateLessons, generateLessonsForMonth } from '@/lib/generate-lessons';
import { scopedBranchId } from '@/lib/branch-scope';

/**
 * POST /api/admin/groups/generate-lessons
 *
 * Body variants:
 * 1. { groupId, year, month } — bitta oy uchun generatsiya
 * 2. { groupId, months } — startDate dan boshlab months oy uchun
 * 3. { groupId } — startDate dan boshlab 12 oy uchun (default)
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { groupId, year, month, months, endDate } = body;

    if (!groupId) {
      return NextResponse.json({ error: 'groupId kerak' }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, dayType: true, time: true, startDate: true, name: true, branchId: true },
    });

    if (!group) {
      return NextResponse.json({ error: 'Guruh topilmadi' }, { status: 404 });
    }

    // Filial cheklovi: boshqa filial guruhiga dars generatsiya qilib bo'lmaydi
    const bId = await scopedBranchId(auth);
    if (bId && group.branchId !== bId) {
      return NextResponse.json({ error: 'Bu guruh boshqa filialga tegishli' }, { status: 403 });
    }

    // Bitta oy uchun
    if (year && month) {
      const result = await generateLessonsForMonth(groupId, year, month);
      return NextResponse.json(result);
    }

    const startDate = group.startDate || new Date().toISOString().split('T')[0];

    // Sana bo'yicha: startDate dan endDate gacha
    if (endDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return NextResponse.json({ error: 'Sana formati noto\'g\'ri (YYYY-MM-DD)' }, { status: 400 });
      }
      if (endDate < startDate) {
        return NextResponse.json({ error: 'Tugash sanasi boshlanish sanasidan keyin bo\'lishi kerak' }, { status: 400 });
      }
      const result = await generateLessons({
        groupId, startDate, endDate,
        dayType: group.dayType || 'toq',
        time: group.time || '14:00',
      });
      return NextResponse.json(result);
    }

    // Ko'p oylar uchun (eski rejim)
    const result = await generateLessons({
      groupId,
      startDate,
      months: months || 12,
      dayType: group.dayType || 'toq',
      time: group.time || '14:00',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Xatolik yuz berdi' },
      { status: 500 }
    );
  }
}
