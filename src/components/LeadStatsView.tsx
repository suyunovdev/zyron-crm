'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Donut, Bars, MultiLine, Sparkline } from '@/components/charts';
import { SOURCE_LABELS, SOURCE_COLORS } from '@/lib/lead-source';

// Lidlar tahlili (marketing) — davr/filial filtri, KPI sparkline, manba bo'yicha ko'p chiziqli trend.
const fmt = (n: number) => (n || 0).toLocaleString('uz-UZ');
const card = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5';
const MONTHS_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const monthLabel = (ym: string) => { const [, m] = ym.split('-'); return MONTHS_UZ[Number(m) - 1] || ym; };
const STATUS_LABELS: Record<string, string> = {
  new: 'Yangi', contacted: "Qo'ng'iroq qilindi", trial: 'Sinov', enrolled: 'Yozildi', rejected: 'Rad etdi',
};
const PERIODS = [{ k: '3', l: '3 oy' }, { k: '6', l: '6 oy' }, { k: '12', l: '12 oy' }, { k: 'all', l: 'Hammasi' }];

interface LeadStats {
  total: number; thisMonth: number; conversion: number;
  topSource: { slug: string; count: number } | null;
  bySource: { slug: string; count: number }[];
  byStatus: Record<string, number>;
  byBranch: { label: string; count: number }[];
  months: string[];
  trend: { month: string; count: number }[];
  trendBySource: { slug: string; data: number[] }[];
  branches: { id: string; name: string }[];
}

export function LeadStatsView() {
  const [d, setD] = useState<LeadStats | null>(null);
  const [months, setMonths] = useState('6');
  const [branch, setBranch] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBusy(true);
    const qs = `months=${months}${branch ? `&branch=${branch}` : ''}`;
    fetch(`/api/admin/lead-stats?${qs}`).then(r => r.ok ? r.json() : null).then(setD).catch(() => setD(null)).finally(() => setBusy(false));
  }, [months, branch]);

  if (!d) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" /></div>;

  const donut = d.bySource.map(s => ({ label: SOURCE_LABELS[s.slug] || s.slug, value: s.count, color: SOURCE_COLORS[s.slug] || '#94a3b8' }));
  const sourceBars = d.bySource.map(s => ({ label: SOURCE_LABELS[s.slug] || s.slug, value: s.count }));
  const spark = d.trend.map(t => t.count);
  const categories = d.months.map(monthLabel);
  const multi = d.trendBySource.map(s => ({ name: SOURCE_LABELS[s.slug] || s.slug, color: SOURCE_COLORS[s.slug] || '#94a3b8', data: s.data }));
  const statusBars = ['new', 'contacted', 'trial', 'enrolled', 'rejected'].map(k => ({ label: STATUS_LABELS[k], value: d.byStatus[k] || 0 }));

  const kpis = [
    { l: 'Jami lidlar', v: fmt(d.total), spark: true },
    { l: 'Bu oy', v: fmt(d.thisMonth), spark: true },
    { l: 'Konversiya', v: `${d.conversion}%`, spark: false },
    { l: 'Top manba', v: d.topSource ? (SOURCE_LABELS[d.topSource.slug] || d.topSource.slug) : '—', spark: false },
  ];

  return (
    <div className={`space-y-4 transition-opacity ${busy ? 'opacity-60' : ''}`}>
      {/* Filtrlar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {PERIODS.map(p => (
            <button key={p.k} onClick={() => setMonths(p.k)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${months === p.k ? 'bg-white dark:bg-slate-700 text-[var(--brand-primary)] shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
              {p.l}
            </button>
          ))}
        </div>
        {d.branches.length > 0 && (
          <select value={branch} onChange={e => setBranch(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200">
            <option value="">Barcha filiallar</option>
            {d.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        {busy && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </div>

      {/* KPI + sparkline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(x => (
          <div key={x.l} className={card}>
            <p className="text-xs text-slate-500">{x.l}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{x.v}</p>
            {x.spark && spark.length > 1 && <div className="mt-1 -mb-2 -mx-1"><Sparkline data={spark} /></div>}
          </div>
        ))}
      </div>

      {/* Manba ulushi (donut) */}
      <div className={card}>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Manba bo&apos;yicha — qayerdan bildi</p>
        <Donut data={donut} />
      </div>

      {/* Manba bo'yicha oylik trend (ko'p chiziqli) */}
      <div className={card}>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Oylik trend — manba bo&apos;yicha</p>
        <MultiLine categories={categories} series={multi} />
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
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Holat (funnel)</p>
        <Bars data={statusBars} color="#8b5cf6" />
      </div>
    </div>
  );
}
