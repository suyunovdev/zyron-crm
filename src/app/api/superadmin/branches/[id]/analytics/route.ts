import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { computeDebtSummary } from '@/lib/billing';
import { logger } from '@/lib/logger';

// Filial KPI kartochkalarini bosilganда ko'rsatiladigan chart ma'lumotlari (superadmin).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const B = { branchId: id };

    // Oxirgi 6 oy yorliqlari (YYYY-MM)
    const now = new Date();
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const firstMonthStart = `${months[0]}-01`;

    const [
      activeStudents, statusGroups,
      pays, atts, newStuds,
      groups, teacherGroups, debt,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'student', status: 'active', ...B } }),
      prisma.user.groupBy({ by: ['status'], where: { role: 'student', ...B }, _count: true }),
      prisma.payment.findMany({ where: { student: B, month: { in: months } }, select: { amount: true, month: true, method: true, studentId: true } }),
      prisma.attendance.findMany({ where: { lesson: { group: B, scheduledDate: { gte: firstMonthStart } } }, select: { present: true, lesson: { select: { scheduledDate: true } } } }),
      prisma.user.findMany({ where: { role: 'student', ...B, createdAt: { gte: new Date(firstMonthStart) } }, select: { createdAt: true } }),
      prisma.group.findMany({ where: B, select: { name: true, status: true, _count: { select: { students: true } } } }),
      prisma.group.findMany({ where: B, select: { _count: { select: { students: true } }, teacher: { select: { id: true, name: true } } } }),
      computeDebtSummary(id),
    ]);

    // Oylik tushum + to'lov usullari + har oy to'lagan o'quvchilar
    const revenueTrend = months.map(() => 0);
    const methods = { cash: 0, card: 0, transfer: 0 };
    const paidByMonth: Record<string, Set<string>> = {};
    months.forEach(m => (paidByMonth[m] = new Set()));
    for (const p of pays) {
      const mi = months.indexOf(p.month);
      if (mi >= 0) { revenueTrend[mi] += p.amount; paidByMonth[p.month].add(p.studentId); }
      if (p.method === 'card') methods.card += p.amount;
      else if (p.method === 'transfer') methods.transfer += p.amount;
      else methods.cash += p.amount;
    }
    const collectionTrend = months.map(m => activeStudents > 0 ? Math.round((paidByMonth[m].size / activeStudents) * 100) : 0);

    // Oylik davomat %
    const attByMonth: Record<string, { p: number; t: number }> = {};
    months.forEach(m => (attByMonth[m] = { p: 0, t: 0 }));
    for (const a of atts) {
      const m = a.lesson.scheduledDate.slice(0, 7);
      if (attByMonth[m]) { attByMonth[m].t++; if (a.present) attByMonth[m].p++; }
    }
    const attendanceTrend = months.map(m => attByMonth[m].t > 0 ? Math.round((attByMonth[m].p / attByMonth[m].t) * 100) : 0);

    // Oylik yangi o'quvchilar
    const newTrend = months.map(() => 0);
    for (const s of newStuds) {
      const m = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const mi = months.indexOf(m);
      if (mi >= 0) newTrend[mi]++;
    }

    // O'quvchi holati
    const statusMap: Record<string, number> = { active: 0, frozen: 0, archived: 0 };
    for (const g of statusGroups) statusMap[g.status] = (g._count as number) ?? 0;

    // Guruhlar bo'yicha o'quvchilar (top 10)
    const studentsPerGroup = groups
      .map(g => ({ label: g.name, value: g._count.students }))
      .sort((a, b) => b.value - a.value).slice(0, 10);

    // O'qituvchi yuki (guruh + o'quvchi soni)
    const tload: Record<string, { name: string; groups: number; students: number }> = {};
    for (const g of teacherGroups) {
      if (!g.teacher) continue;
      const t = (tload[g.teacher.id] ||= { name: g.teacher.name, groups: 0, students: 0 });
      t.groups++; t.students += g._count.students;
    }
    const teachersLoad = Object.values(tload).sort((a, b) => b.groups - a.groups).slice(0, 10);

    // Eng katta qarzdorlar (top 10)
    const debtorEntries = [...debt.balances.entries()].filter(([, bal]) => bal < 0).sort((a, b) => a[1] - b[1]).slice(0, 10);
    const debtorIds = debtorEntries.map(([sid]) => sid);
    const debtorNames = debtorIds.length
      ? await prisma.user.findMany({ where: { id: { in: debtorIds } }, select: { id: true, name: true } })
      : [];
    const nameMap = new Map(debtorNames.map(u => [u.id, u.name]));
    const topDebtors = debtorEntries.map(([sid, bal]) => ({ label: nameMap.get(sid) || '—', value: -bal }));

    return NextResponse.json({
      months,
      revenueTrend, methods, collectionTrend, attendanceTrend, newTrend,
      studentStatus: statusMap,
      studentsPerGroup, teachersLoad, topDebtors,
    });
  } catch (error) {
    logger.error('[GET /api/superadmin/branches/[id]/analytics]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
