'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScrollText, Loader2 } from 'lucide-react';

interface Log {
  id: string; actorName: string; actorRole: string; action: string;
  entity: string; summary: string; createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-700', update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700', 'reset-password': 'bg-amber-100 text-amber-700',
  'login-as': 'bg-purple-100 text-purple-700', 'force-logout': 'bg-orange-100 text-orange-700',
  danger: 'bg-red-100 text-red-700', backup: 'bg-slate-100 text-slate-600',
  export: 'bg-slate-100 text-slate-600', broadcast: 'bg-cyan-100 text-cyan-700',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/superadmin/audit${entity ? `?entity=${entity}` : ''}`);
    if (res.ok) { const d = await res.json(); setLogs(d.data); }
    setLoading(false);
  }, [entity]);
  useEffect(() => { load(); }, [load]);

  const fmt = (s: string) => new Date(s).toLocaleString('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-slate-600" /> Audit jurnali
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Kim nima o&apos;zgartirgani</p>
        </div>
        <select value={entity} onChange={e => setEntity(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-700">
          <option value="">Barchasi</option>
          <option value="admin">Adminlar</option>
          <option value="payment">To&apos;lovlar</option>
          <option value="user">Foydalanuvchilar</option>
          <option value="setting">Sozlamalar</option>
          <option value="branch">Filiallar</option>
          <option value="system">Tizim</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#2660A4]" /></div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Vaqt</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Kim</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500">Amal</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Tafsilot</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="py-2.5 px-4 text-xs text-slate-400 whitespace-nowrap">{fmt(l.createdAt)}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-slate-700">{l.actorName}</span>
                      <span className="text-xs text-slate-400 ml-1">({l.actorRole})</span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[l.action] || 'bg-slate-100 text-slate-600'}`}>{l.action}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{l.summary}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-400">Yozuv yo&apos;q</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
