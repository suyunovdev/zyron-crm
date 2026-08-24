import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { normalizeSource } from '@/lib/lead-source';

// Lidlar tahlili (superadmin) — manba/status/filial/oylik trend agregatsiyalari.
export async function GET() {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const leads = await prisma.lead.findMany({
      select: { source: true, status: true, branchId: true, createdAt: true },
    });
    const total = leads.length;

    // Toshkent vaqti bo'yicha oy (YYYY-MM)
    const ymTz = (dt: Date) => {
      const z = new Date(dt.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
      return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}`;
    };
    const base = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
    const currentMonth = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const sourceCount: Record<string, number> = {};
    const statusCount: Record<string, number> = {};
    const monthCount: Record<string, number> = {};
    let thisMonth = 0;

    const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
    const branchNameById: Record<string, string> = Object.fromEntries(branches.map(b => [b.id, b.name]));
    const branchCount: Record<string, number> = {};

    for (const l of leads) {
      const src = normalizeSource(l.source);
      sourceCount[src] = (sourceCount[src] || 0) + 1;
      statusCount[l.status] = (statusCount[l.status] || 0) + 1;
      const bkey = l.branchId ? (branchNameById[l.branchId] || 'Nomaʼlum') : 'Filialsiz';
      branchCount[bkey] = (branchCount[bkey] || 0) + 1;
      const ym = ymTz(l.createdAt);
      monthCount[ym] = (monthCount[ym] || 0) + 1;
      if (ym === currentMonth) thisMonth++;
    }

    const bySource = Object.entries(sourceCount)
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count);
    const byBranch = Object.entries(branchCount)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
    const trend = months.map(m => ({ month: m, count: monthCount[m] || 0 }));

    const enrolled = statusCount['enrolled'] || 0;
    const conversion = total > 0 ? Math.round((enrolled / total) * 100) : 0;
    const topSource = bySource[0] || null;

    return NextResponse.json({
      total, thisMonth, conversion, topSource,
      bySource, byStatus: statusCount, byBranch, trend,
    });
  } catch (error) {
    logger.error('[GET /api/superadmin/lead-stats]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
