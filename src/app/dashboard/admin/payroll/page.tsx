'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wallet, Loader2, Check } from 'lucide-react';

interface Row {
  teacherId: string; name: string; subject: string | null; level: string | null;
  salaryShare: number; revenue: number; salary: number;
}

const fmt = (n: number) => n.toLocaleString('uz-UZ');

export default function PayrollPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ salary: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/superadmin/payroll');
    if (res.ok) {
      const d = await res.json();
      setRows(d.payroll);
      setTotals({ salary: d.totalSalary, revenue: d.totalRevenue });
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveShare = async (teacherId: string) => {
    const val = edits[teacherId];
    if (val === undefined) return;
    setSaving(teacherId);
    const res = await fetch('/api/superadmin/payroll', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId, salaryShare: Number(val) }),
    });
    if (!res.ok) { const e = await res.json(); alert(e.error || 'Xato'); }
    setEdits(p => { const n = { ...p }; delete n[teacherId]; return n; });
    await load();
    setSaving('');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-emerald-600" /> Ustozlar oyligi
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Guruh tushumidan ulush asosida (qatnashuvga bog'liq)</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#2660A4]" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-white">
              <p className="text-xs text-slate-500">Jami tushum</p>
              <p className="text-2xl font-bold text-slate-900">{fmt(totals.revenue)} <span className="text-sm font-normal text-slate-400">so&apos;m</span></p>
            </div>
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50">
              <p className="text-xs text-emerald-600">Jami oylik (to&apos;lanadigan)</p>
              <p className="text-2xl font-bold text-emerald-700">{fmt(totals.salary)} <span className="text-sm font-normal text-emerald-500">so&apos;m</span></p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">O&apos;qituvchi</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Tushum</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500">Ulush %</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Oylik</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.teacherId} className="border-t border-slate-100">
                      <td className="py-2.5 px-4">
                        <p className="font-medium text-slate-800">{r.name}</p>
                        <p className="text-xs text-slate-400">{r.subject}{r.level ? ` • ${r.level}` : ''}</p>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-600">{fmt(r.revenue)}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" min={0} max={100}
                            value={edits[r.teacherId] ?? String(r.salaryShare)}
                            onChange={e => setEdits(p => ({ ...p, [r.teacherId]: e.target.value }))}
                            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm text-center bg-white text-slate-800" />
                          {edits[r.teacherId] !== undefined && (
                            <button onClick={() => saveShare(r.teacherId)} disabled={saving === r.teacherId}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50">
                              {saving === r.teacherId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">{fmt(r.salary)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-400">O&apos;qituvchi yo&apos;q</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
