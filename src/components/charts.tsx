'use client';

// Yengil, dependency'siz SVG chartlar. Theme-aware (dark/light globals.css orqali).

const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

// ── Donut (halqa) diagramma + legenda ──
export function Donut({ data, size = 150 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        <g transform={`translate(${size / 2},${size / 2}) rotate(-90)`}>
          <circle r={r} fill="none" stroke="var(--chart-track,#e8edf3)" strokeWidth="14" />
          {total > 0 && data.map((d, i) => {
            const len = (d.value / total) * c;
            const seg = <circle key={i} r={r} fill="none" stroke={d.color} strokeWidth="14"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />;
            offset += len;
            return seg;
          })}
        </g>
        <text x="50%" y="47%" textAnchor="middle" className="fill-slate-800 dark:fill-slate-100" style={{ fontSize: size / 7, fontWeight: 800 }}>{fmt(total)}</text>
        <text x="50%" y="62%" textAnchor="middle" className="fill-slate-400" style={{ fontSize: size / 13 }}>jami</text>
      </svg>
      <div className="space-y-1.5">
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

// ── Gorizontal bar diagramma ──
export function Bars({ data, color = 'var(--brand-primary)', unit = '' }: { data: { label: string; value: number }[]; color?: string; unit?: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  if (data.length === 0) return <p className="text-sm text-slate-400 text-center py-6">Ma&apos;lumot yo&apos;q</p>;
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-sm text-slate-600 dark:text-slate-300 w-32 truncate flex-shrink-0" title={d.label}>{d.label}</span>
          <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden relative">
            <div className="h-full rounded-md transition-all" style={{ width: `${(d.value / max) * 100}%`, background: color, minWidth: d.value > 0 ? 4 : 0 }} />
          </div>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 w-24 text-right tabular-nums flex-shrink-0">{fmt(d.value)}{unit}</span>
        </div>
      ))}
    </div>
  );
}

// ── Chiziq/maydon (area) diagramma — oylar bo'yicha trend ──
export function LineArea({
  data, color = 'var(--brand-primary)', unit = '', height = 200, valueFmt,
}: { data: { label: string; value: number }[]; color?: string; unit?: string; height?: number; valueFmt?: (n: number) => string }) {
  if (data.length === 0) return <p className="text-sm text-slate-400 text-center py-6">Ma&apos;lumot yo&apos;q</p>;
  const W = 560, H = height, padL = 8, padR = 8, padT = 16, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const max = Math.max(1, ...data.map(d => d.value));
  const min = Math.min(0, ...data.map(d => d.value));
  const range = max - min || 1;
  const n = data.length;
  const x = (i: number) => padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => padT + ih - ((v - min) / range) * ih;
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const areaPts = `${padL},${padT + ih} ${pts} ${padL + iw},${padT + ih}`;
  const gid = `g${Math.random().toString(36).slice(2, 7)}`;
  const vf = valueFmt || ((v: number) => fmt(v) + unit);
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 420 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.28" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid */}
        {[0, 0.5, 1].map((f, i) => (
          <line key={i} x1={padL} x2={padL + iw} y1={padT + ih * f} y2={padT + ih * f} stroke="var(--chart-grid,#eef1f5)" strokeWidth="1" />
        ))}
        <polygon points={areaPts} fill={`url(#${gid})`} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.value)} r="3.5" fill={color} />
            <text x={x(i)} y={y(d.value) - 9} textAnchor="middle" className="fill-slate-500 dark:fill-slate-300" style={{ fontSize: 11, fontWeight: 600 }}>{vf(d.value)}</text>
            <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 10 }}>{d.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
