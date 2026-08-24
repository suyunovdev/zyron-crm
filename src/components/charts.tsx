'use client';

// ApexCharts asosidagi "real" chartlar — o'qlar, gridlar, gradient, hover tooltip, zoom.
// Tema-aware (light/dark). Bir xil API (Donut/Bars/LineArea). SSR yo'q (window kerak).
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { ApexOptions } from 'apexcharts';
import { useTheme } from '@/components/ThemeProvider';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const fmt = (n: number) => (n ?? 0).toLocaleString('en-US').replace(/,/g, ' ');

// Tema bo'yicha ranglar
function usePalette() {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return {
    dark,
    mode: (dark ? 'dark' : 'light') as 'dark' | 'light',
    ink: dark ? '#cbd5e1' : '#475569',      // o'q/label matni
    inkStrong: dark ? '#f1f5f9' : '#0f172a', // markaz jami
    grid: dark ? '#334155' : '#e2e8f0',
    stroke: dark ? '#1e293b' : '#ffffff',    // segmentlar orasidagi chiziq (card fon)
  };
}

// White-label brend rangini CSS o'zgaruvchisidan olish (hex — ApexCharts JS'да ishlatadi).
function useBrandColor(explicit?: string): string {
  const [c, setC] = useState(explicit && !explicit.startsWith('var(') ? explicit : '#2660A4');
  useEffect(() => {
    if (explicit && !explicit.startsWith('var(')) return;
    const v = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim();
    if (v) setC(v);
  }, [explicit]);
  return c;
}

// ── Donut (halqa) ──
export function Donut({ data, size = 300 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const p = usePalette();
  const options: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'inherit', background: 'transparent' },
    theme: { mode: p.mode },
    labels: data.map(d => d.label),
    colors: data.map(d => d.color),
    stroke: { width: 2, colors: [p.stroke] },
    legend: { position: 'right', fontSize: '14px', labels: { colors: p.ink }, itemMargin: { vertical: 4 }, markers: { size: 6 } },
    dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%`, style: { fontSize: '12px', fontWeight: '700', colors: ['#fff'] }, dropShadow: { enabled: true, blur: 2, opacity: 0.4 } },
    plotOptions: {
      pie: {
        donut: {
          size: '62%',
          labels: {
            show: true,
            name: { color: p.ink },
            value: { fontSize: '26px', fontWeight: 800, color: p.inkStrong, formatter: (v: string) => fmt(Number(v)) },
            total: { show: true, label: 'Jami', color: p.ink, formatter: (w) => fmt(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)) },
          },
        },
      },
    },
    tooltip: { theme: p.mode, y: { formatter: (v: number) => fmt(v) } },
    responsive: [{ breakpoint: 640, options: { legend: { position: 'bottom' } } }],
  };
  return <Chart type="donut" series={data.map(d => d.value)} options={options} height={size} width="100%" />;
}

// ── Gorizontal bar ──
export function Bars({ data, color, unit = '' }: { data: { label: string; value: number }[]; color?: string; unit?: string }) {
  const p = usePalette();
  const col = useBrandColor(color);
  if (data.length === 0) return <p className="text-sm text-slate-400 text-center py-6">Ma&apos;lumot yo&apos;q</p>;
  const options: ApexOptions = {
    chart: { type: 'bar', fontFamily: 'inherit', toolbar: { show: false }, foreColor: p.ink, background: 'transparent' },
    theme: { mode: p.mode },
    plotOptions: { bar: { horizontal: true, borderRadius: 6, borderRadiusApplication: 'end', barHeight: '58%' } },
    colors: [col],
    dataLabels: { enabled: true, formatter: (v: number) => `${fmt(v)}${unit}`, offsetX: 24, style: { fontSize: '12px', fontWeight: '700', colors: [p.ink] } },
    xaxis: { categories: data.map(d => d.label), labels: { formatter: (v: string) => fmt(Number(v)), style: { colors: p.ink } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { fontSize: '13px', colors: p.ink } } },
    grid: { borderColor: p.grid, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: { theme: p.mode, y: { formatter: (v: number) => `${fmt(v)}${unit}` } },
  };
  return <Chart type="bar" series={[{ name: 'Soni', data: data.map(d => d.value) }]} options={options} height={data.length * 54 + 50} width="100%" />;
}

// ── Chiziq/maydon (area) ──
export function LineArea({
  data, color, unit = '', height = 300, valueFmt,
}: { data: { label: string; value: number }[]; color?: string; unit?: string; height?: number; valueFmt?: (n: number) => string }) {
  const p = usePalette();
  const col = useBrandColor(color);
  if (data.length === 0) return <p className="text-sm text-slate-400 text-center py-6">Ma&apos;lumot yo&apos;q</p>;
  const vf = valueFmt || ((v: number) => `${fmt(v)}${unit}`);
  const options: ApexOptions = {
    chart: {
      type: 'area', fontFamily: 'inherit', foreColor: p.ink, background: 'transparent',
      toolbar: { show: true, tools: { download: true, zoom: true, zoomin: true, zoomout: true, pan: false, reset: true, selection: false } },
      zoom: { enabled: true, type: 'x' },
    },
    theme: { mode: p.mode },
    colors: [col],
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    markers: { size: 4, strokeWidth: 2, strokeColors: p.stroke, hover: { size: 6 } },
    dataLabels: { enabled: true, formatter: (v: number) => vf(v), style: { fontSize: '11px', fontWeight: '700', colors: [p.ink] }, background: { enabled: false }, offsetY: -6 },
    xaxis: { categories: data.map(d => d.label), labels: { style: { colors: p.ink } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v: number) => fmt(v), style: { colors: p.ink } } },
    grid: { borderColor: p.grid, strokeDashArray: 4 },
    tooltip: { theme: p.mode, y: { formatter: (v: number) => vf(v) } },
  };
  return <Chart type="area" series={[{ name: 'Qiymat', data: data.map(d => d.value) }]} options={options} height={height} width="100%" />;
}
