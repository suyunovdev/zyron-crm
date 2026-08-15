import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { scopedBranchId } from '@/lib/branch-scope';
import { computeDebtSummary } from '@/lib/billing';
import { logger } from '@/lib/logger';

// Xabar yuborish paneli uchun o'quvchilar ro'yxati (checkbox bilan tanlash).
// Har biri: holat, ota-onasi bormi, oxirgi xabar sanasi, qarzdormi.
export async function GET() {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;
    const bId = await scopedBranchId(auth);
    const branchWhere = bId ? { branchId: bId } : {};

    const [students, lastMsgs, debt] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'student', ...branchWhere },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, phone: true, status: true, parentId: true },
      }),
      prisma.message.groupBy({ by: ['studentId'], _max: { createdAt: true } }),
      computeDebtSummary(bId),
    ]);

    const lastMap = new Map(lastMsgs.map(m => [m.studentId, m._max.createdAt]));
    const debtorSet = new Set([...debt.balances.entries()].filter(([, b]) => b < 0).map(([id]) => id));

    const data = students.map(s => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      status: s.status,
      hasParent: Boolean(s.parentId),
      isDebtor: debtorSet.has(s.id),
      lastMessageAt: lastMap.get(s.id) ?? null,
    }));

    return NextResponse.json({ students: data });
  } catch (error) {
    logger.error('[GET /api/admin/messages/recipients]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
