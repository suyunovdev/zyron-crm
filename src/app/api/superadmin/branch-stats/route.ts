import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { computeDebtSummary } from '@/lib/billing';
import { logger } from '@/lib/logger';

// Har filial bo'yicha asosiy ko'rsatkichlar (dashboard "Filiallar" bo'limi uchun).
// Faqat superadmin — filial admini o'z filialini oddiy dashboardda ko'radi.
export async function GET() {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const branches = await prisma.branch.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true } });

    const data = await Promise.all(branches.map(async (b) => {
      const [activeStudents, totalStudents, groups, teachers, monthPayments, debt] = await Promise.all([
        prisma.user.count({ where: { role: 'student', status: 'active', branchId: b.id } }),
        prisma.user.count({ where: { role: 'student', branchId: b.id } }),
        prisma.group.count({ where: { branchId: b.id } }),
        prisma.user.count({ where: { role: 'teacher', branchId: b.id } }),
        prisma.payment.findMany({ where: { month: currentMonth, student: { branchId: b.id } }, select: { amount: true } }),
        computeDebtSummary(b.id),
      ]);
      const monthRevenue = monthPayments.reduce((s, p) => s + p.amount, 0);
      // To'lov intizomi: qarzi yo'q faol o'quvchilar ulushi (0-100%)
      const collectionRate = activeStudents > 0
        ? Math.round(((activeStudents - debt.debtorCount) / activeStudents) * 100)
        : 100;
      return {
        id: b.id, name: b.name,
        activeStudents, totalStudents, groups, teachers,
        monthRevenue, debt: debt.totalDebt, debtors: debt.debtorCount,
        collectionRate,
      };
    }));

    return NextResponse.json({ branches: data });
  } catch (error) {
    logger.error('[GET /api/superadmin/branch-stats]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
