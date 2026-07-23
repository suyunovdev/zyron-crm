'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserCircle, Wallet, CalendarDays, Loader2, TrendingUp } from 'lucide-react';

interface Daily { date: string; billableCount: number; revenue: number; earning: number; }
interface Detail {
  name: string; subject: string | null; level: string | null; salaryShare: number;
  month: string; revenue: number; salary: number; todayDate: string; todayEarning: number;
  daily: Daily[]; groups: { id: string; name: string; revenue: number; salary: number }[];
}

const fmt = (n: number) => (n || 0).toLocaleString('uz-UZ');
function currentMonth() { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; }
const dayLabel = (d: string) => new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', weekday: 'short' });

export default function TeacherProfilePage() {
  const [d, setD] = useState<Detail | null>(null);
  const [month, setMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/teacher/salary?month=${month}`);
    if (res.ok) setD(await res.json());
    setLoading(false);
  }, [month]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <UserCircle className="w-6 h-6 text-[#2660A4]" /> Profil
        </h1>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700" />
      </div>

      {loading || !d ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#2660A4]" /></div>
      ) : (
        <>
          {/* Ustoz ma'lumoti */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#2660A4] flex items-center justify-center text-white text-lg font-bold">
              {d.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{d.name}</p>
              <p className="text-sm text-slate-500">
                {d.subject}{d.level ? ` • ${d.level}` : ''} • Ulush: <span className="font-semibold text-slate-700">{d.salaryShare}%</span>
              </p>
            </div>
          </div>

          {/* Bugungi + oylik */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs text-emerald-600 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Bugungi maosh</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{fmt(d.todayEarning)} <span className="text-sm font-normal">so&apos;m</span></p>
              <p className="text-[11px] text-emerald-600/70 mt-0.5">{dayLabel(d.todayDate)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500 flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Oylik ({d.month})</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(d.salary)} <span className="text-sm font-normal text-slate-400">so&apos;m</span></p>
              <p className="text-[11px] text-slate-400 mt-0.5">Tushum: {fmt(d.revenue)} so&apos;m</p>
            </div>
          </div>

          {/* Guruhlar bo'yicha */}
          {d.groups.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Guruhlar bo&apos;yicha ({d.month})</p>
              {d.groups.map(g => (
                <div key={g.id} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0 text-sm">
                  <span className="text-slate-700">{g.name}</span>
                  <span className="font-medium text-slate-900">{fmt(g.salary)} so&apos;m <span className="text-xs text-slate-400">(tushum {fmt(g.revenue)})</span></span>
                </div>
              ))}
            </div>
          )}

          {/* Kunlik taqsimot */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-700">Kunlik maosh (o&apos;tilgan dars va davomatga qarab)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-slate-500">Kun</th>
                    <th className="text-center py-2.5 px-4 text-xs font-medium text-slate-500">Davomat</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-slate-500">Maosh</th>
                  </tr>
                </thead>
                <tbody>
                  {d.daily.map(row => (
                    <tr key={row.date} className={`border-t border-slate-50 ${row.date === d.todayDate ? 'bg-emerald-50/40' : ''}`}>
                      <td className="py-2.5 px-4 text-slate-700">{dayLabel(row.date)}</td>
                      <td className="py-2.5 px-4 text-center text-slate-500">{row.billableCount} ta</td>
                      <td className="py-2.5 px-4 text-right font-medium text-slate-900">{fmt(row.earning)} so&apos;m</td>
                    </tr>
                  ))}
                  {d.daily.length === 0 && (
                    <tr><td colSpan={3} className="py-8 text-center text-sm text-slate-400">Bu oyda o&apos;tilgan dars yo&apos;q</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
