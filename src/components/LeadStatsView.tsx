'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Donut, Bars, LineArea } from '@/components/charts';
import { SOURCE_LABELS, SOURCE_COLORS } from '@/lib/lead-source';

// Lidlar tahlili (marketing) — lidlar sahifasi va superadmin Tizim tabида ishlatiladi.
// Ma'lumot filial bo'yicha cheklanadi (API'да scopedBranchId).

const fmt = (n: number) => (n || 0).toLocaleString('uz-UZ');
const card = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5';
const MONTHS_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const monthLabel = (ym: string) => { const [, m] = ym.split('-'); return MONTHS_UZ[Number(m) - 1] || ym; };
const STATUS_LABELS: Record<string, string> = {
  new: 'Yangi', contacted: "Qo'ng'iroq qilindi", trial: 'Sinov', enrolled: 'Yozildi', rejected: 'Rad etdi',
};

interface LeadStats {
  total: number; thisMonth: number; conversion: number;
  topSource: { slug: string; count: number } | null;
  bySource: { slug: string; count: number }[];
  byStatus: Record<string, number>;
  byBranch: { label: string; count: number }[];
  trend: { month: string; count: number }[];
}

export function LeadStatsView() {
  const [d, setD] = useState<LeadStats | null>(null);
  useEffect(() => { fetch('/api/admin/lead-stats').then(r => r.ok ? r.json() : null).then(setD).catch(() => setD(null)); }, []);
  if (!d) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" /></div>;

  const donut = d.bySource.map(s => ({ label: SOURCE_LABELS[s.slug] || s.slug, value: s.count, color: SOURCE_COLORS[s.slug] || '#94a3b8' }));
  const sourceBars = d.bySource.map(s => ({ label: SOURCE_LABELS[s.slug] || s.slug, value: s.count }));
  const trend = d.trend.map(t => ({ label: monthLabel(t.month), value: t.count }));
  const statusBars = ['new', 'contacted', 'trial', 'enrolled', 'rejected'].map(k => ({ label: STATUS_LABELS[k], value: d.byStatus[k] || 0 }));
  const kpis = [
    { l: 'Jami lidlar', v: fmt(d.total) },
    { l: 'Bu oy', v: fmt(d.thisMonth) },
    { l: 'Konversiya', v: `${d.conversion}%` },
    { l: 'Top manba', v: d.topSource ? (SOURCE_LABELS[d.topSource.slug] || d.topSource.slug) : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(x => (
          <div key={x.l} className={card}><p className="text-xs text-slate-500">{x.l}</p><p className="text-xl font-bold text-slate-900 dark:text-white">{x.v}</p></div>
        ))}
      </div>
      <div className={card}>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Manba bo&apos;yicha — qayerdan bildi</p>
        <Donut data={donut} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className={card}>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Manba — soni</p>
          <Bars data={sourceBars} />
        </div>
        <div className={card}>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Filial bo&apos;yicha</p>
          <Bars data={d.byBranch.map(b => ({ label: b.label, value: b.count }))} />
        </div>
      </div>
      <div className={card}>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Oylik trend (6 oy)</p>
        <LineArea data={trend} />
      </div>
      <div className={card}>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Holat (funnel)</p>
        <Bars data={statusBars} color="#8b5cf6" />
      </div>
    </div>
  );
}
