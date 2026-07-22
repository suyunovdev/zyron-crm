import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { computePayroll } from '@/lib/payroll';
import { computeDebtSummary } from '@/lib/billing';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    // Oxirgi 6 oy tushum trendi
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const payments = await prisma.payment.groupBy({
      by: ['month'],
      where: { month: { in: months } },
      _sum: { amount: true },
    });
    const revByMonth = new Map(payments.map(p => [p.month, p._sum.amount || 0]));
    const revenueTrend = months.map(m => ({ month: m, revenue: revByMonth.get(m) || 0 }));

    // Lid konversiya funneli
    const leadStatuses = await prisma.lead.groupBy({ by: ['status'], _count: true });
    const funnel: Record<string, number> = {};
    for (const l of leadStatuses) funnel[l.status] = l._count;

    // Top ustozlar (tushum bo'yicha)
    const payroll = await computePayroll(0);
    const topTeachers = payroll.slice(0, 5).map(t => ({ name: t.name, revenue: t.revenue, students: t.groups.length }));

    // Qarzdorlik + o'quvchilar
    const [debt, totalStudents, activeStudents, totalGroups] = await Promise.all([
      computeDebtSummary(),
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { role: 'student', status: 'active' } }),
      prisma.group.count({ where: { status: 'active' } }),
    ]);

    const totalRevenue6m = revenueTrend.reduce((s, r) => s + r.revenue, 0);

    return NextResponse.json({
      revenueTrend,
      funnel,
      topTeachers,
      totalStudents,
      activeStudents,
      totalGroups,
      totalDebt: debt.totalDebt,
      debtorCount: debt.debtorCount,
      totalRevenue6m,
    });
  } catch (error) {
    logger.error('[GET /api/superadmin/analytics]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
