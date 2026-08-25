import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { scopedBranchId } from '@/lib/branch-scope';
import { logger } from '@/lib/logger';
import { normalizeSource, leadChannel } from '@/lib/lead-source';

// Lidlar tahlili (admin + superadmin) — davr/filial filtri, manba/status/filial, oylik trend
// (jami + manba bo'yicha). Admin: o'z filiali + landing; superadmin: hammasi yoki tanlangan filial.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const periodRaw = url.searchParams.get('months') || '6';
    const period: number | 'all' = periodRaw === 'all' ? 'all' : ([3, 6, 12].includes(Number(periodRaw)) ? Number(periodRaw) : 6);
    const branchParam = url.searchParams.get('branch') || '';

    const isSuper = auth.role === 'superadmin';
    const bId = await scopedBranchId(auth); // superadmin → null

    // Filial cheklovi
    let branchWhere: Record<string, unknown> = {};
    if (bId) branchWhere = { OR: [{ branchId: bId }, { branchId: null }] };
    else if (isSuper && branchParam) branchWhere = { branchId: branchParam };

    const base = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
    const ymTz = (dt: Date) => {
      const z = new Date(dt.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
      return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}`;
    };
    const currentMonth = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
    const windowN = period === 'all' ? 12 : period;
    const months: string[] = [];
    for (let i = windowN - 1; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // Davr filtri (all bo'lsa — cheklovsiz)
    let dateWhere: Record<string, unknown> = {};
    if (period !== 'all') {
      const from = new Date(base.getFullYear(), base.getMonth() - (period - 1), 1);
      dateWhere = { createdAt: { gte: from } };
    }

    const where = { ...branchWhere, ...dateWhere };
    const leads = await prisma.lead.findMany({ where, select: { source: true, status: true, branchId: true, createdAt: true, telegramChatId: true } });
    const total = leads.length;

    const branches = await prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' } });
    const branchNameById: Record<string, string> = Object.fromEntries(branches.map(b => [b.id, b.name]));

    const sourceCount: Record<string, number> = {};
    const channelCount: Record<string, number> = { bot: 0, website: 0, manual: 0 };
    const statusCount: Record<string, number> = {};
    const branchCount: Record<string, number> = {};
    const monthCount: Record<string, number> = {};
    const bySourceMonth: Record<string, number[]> = {}; // slug → [count per month]
    let thisMonth = 0;

    for (const l of leads) {
      const src = normalizeSource(l.source);
      sourceCount[src] = (sourceCount[src] || 0) + 1;
      channelCount[leadChannel(l)] = (channelCount[leadChannel(l)] || 0) + 1;
      statusCount[l.status] = (statusCount[l.status] || 0) + 1;
      const bkey = l.branchId ? (branchNameById[l.branchId] || 'Nomaʼlum') : 'Filialsiz';
      branchCount[bkey] = (branchCount[bkey] || 0) + 1;
      const ym = ymTz(l.createdAt);
      monthCount[ym] = (monthCount[ym] || 0) + 1;
      if (ym === currentMonth) thisMonth++;
      const mi = months.indexOf(ym);
      if (mi >= 0) (bySourceMonth[src] ??= new Array(months.length).fill(0))[mi]++;
    }

    const bySource = Object.entries(sourceCount).map(([slug, count]) => ({ slug, count })).sort((a, b) => b.count - a.count);
    const byChannel = (['bot', 'website', 'manual'] as const).map((key) => ({ key, count: channelCount[key] || 0 }));
    const botLeads = channelCount.bot || 0;
    const byBranch = Object.entries(branchCount).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    const trend = months.map(m => ({ month: m, count: monthCount[m] || 0 }));
    const trendBySource = Object.entries(bySourceMonth).map(([slug, data]) => ({ slug, data }))
      .sort((a, b) => b.data.reduce((s, x) => s + x, 0) - a.data.reduce((s, x) => s + x, 0));
    const enrolled = statusCount['enrolled'] || 0;
    const conversion = total > 0 ? Math.round((enrolled / total) * 100) : 0;
    const topSource = bySource[0] || null;

    return NextResponse.json({
      total, thisMonth, conversion, topSource, botLeads,
      bySource, byChannel, byStatus: statusCount, byBranch,
      months, trend, trendBySource,
      period: periodRaw, appliedBranch: branchParam,
      branches: isSuper ? branches : [],
    });
  } catch (error) {
    logger.error('[GET /api/admin/lead-stats]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
