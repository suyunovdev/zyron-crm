'use client';

// Recharts asosidagi chartlar. Bir xil API (Donut/Bars/LineArea) — barcha joyда ishlatiladi.
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, LabelList,
} from 'recharts';

const fmt = (n: number) => (n ?? 0).toLocaleString('en-US').replace(/,/g, ' ');
const AXIS = '#94a3b8';   // slate-400 — light/dark ikkalasida o'qiladi
const GRID = '#e2e8f0';   // slate-200
const tooltipStyle = { borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };

// ── Donut (halqa) + legenda ──
export function Donut({ data, size = 170 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="64%" outerRadius="100%"
              paddingAngle={2} strokeWidth={0} isAnimationActive>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [fmt(Number(v)), String(n ?? '')]} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">{fmt(total)}</span>
          <span className="text-xs text-slate-400">jami</span>
        </div>
      </div>
      <div className="space-y-1.5 min-w-[180px]">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.color }} />
            <span className="text-slate-600 dark:text-slate-300">{d.label}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 ml-auto tabular-nums">{fmt(d.value)}</span>
            <span className="text-xs text-slate-400 w-10 text-right tabular-nums">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Gorizontal bar ──
export function Bars({ data, color = 'var(--brand-primary)', unit = '' }: { data: { label: string; value: number }[]; color?: string; unit?: string }) {
  if (data.length === 0) return <p className="text-sm text-slate-400 text-center py-6">Ma&apos;lumot yo&apos;q</p>;
  return (
    <ResponsiveContainer width="100%" height={data.length * 44 + 10}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 4 }} barCategoryGap="22%">
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={130} tickLine={false} axisLine={false}
          tick={{ fontSize: 12, fill: AXIS }} />
        <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} formatter={(v) => [`${fmt(Number(v))}${unit}`, '']} contentStyle={tooltipStyle} />
        <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} barSize={18} isAnimationActive>
          <LabelList dataKey="value" position="right" formatter={(v) => `${fmt(Number(v))}${unit}`} style={{ fontSize: 12, fontWeight: 600, fill: AXIS }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Chiziq/maydon (area) trend ──
export function LineArea({
  data, color = 'var(--brand-primary)', unit = '', height = 220, valueFmt,
}: { data: { label: string; value: number }[]; color?: string; unit?: string; height?: number; valueFmt?: (n: number) => string }) {
  if (data.length === 0) return <p className="text-sm text-slate-400 text-center py-6">Ma&apos;lumot yo&apos;q</p>;
  const vf = valueFmt || ((v: number) => `${fmt(v)}${unit}`);
  const gid = 'area-grad';
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 20, right: 16, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: AXIS }} />
        <YAxis hide />
        <Tooltip formatter={(v) => [vf(Number(v)), '']} contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#${gid})`} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} isAnimationActive>
          <LabelList dataKey="value" position="top" formatter={(v) => vf(Number(v))} style={{ fontSize: 11, fontWeight: 600, fill: AXIS }} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
