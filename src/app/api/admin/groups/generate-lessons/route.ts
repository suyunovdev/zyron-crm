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
    const { groupId, year, month, months } = body;

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

    // Ko'p oylar uchun
    const startDate = group.startDate || new Date().toISOString().split('T')[0];
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
