'use client';

import { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Send, Search, Loader2, Users } from 'lucide-react';
import { toast } from '@/components/toast';
import { fmtDateTime } from '@/lib/date';

interface Recipient {
  id: string; name: string; phone: string | null; status: string;
  hasParent: boolean; isDebtor: boolean; lastMessageAt: string | null;
}
interface Sent { id: string; studentName: string; body: string; createdAt: string; read: boolean }

type StatusFilter = 'all' | 'active' | 'frozen' | 'archived' | 'debtors';

const STATUS_CHIPS: { value: StatusFilter; label: string; danger?: boolean }[] = [
  { value: 'all', label: 'Hammasi' },
  { value: 'active', label: 'Faol' },
  { value: 'frozen', label: 'Muzlatilgan' },
  { value: 'archived', label: 'Arxiv' },
  { value: 'debtors', label: 'Qarzdorlar', danger: true },
];
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active: { label: 'Faol', cls: 'bg-emerald-100 text-emerald-700' },
  frozen: { label: 'Muzlatilgan', cls: 'bg-blue-100 text-blue-700' },
  archived: { label: 'Arxiv', cls: 'bg-slate-100 text-slate-500' },
};

function relTime(iso: string | null): string {
  if (!iso) return 'xabar yo\'q';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hozirgina';
  if (min < 60) return `${min} daq oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;
  return `${Math.floor(hr / 24)} kun oldin`;
}

export default function AdminMessagesPage() {
  const [tab, setTab] = useState<'send' | 'history'>('send');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [sent, setSent] = useState<Sent[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const loadSent = () => fetch('/api/admin/messages').then(r => r.ok ? r.json() : { messages: [] }).then(d => setSent(d.messages || []));
  const loadRecipients = () => fetch('/api/admin/messages/recipients').then(r => r.ok ? r.json() : { students: [] }).then(d => setRecipients(d.students || []));

  useEffect(() => {
    Promise.all([loadRecipients(), loadSent()]).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchStatus = (s: Recipient) =>
      statusFilter === 'all' ? true
        : statusFilter === 'debtors' ? s.isDebtor
        : s.status === statusFilter;
    return recipients.filter(s =>
      matchStatus(s) &&
      (!q || s.name.toLowerCase().includes(q) || (s.phone || '').includes(q)),
    );
  }, [recipients, statusFilter, search]);

  const selectableIds = useMemo(() => filtered.filter(s => s.hasParent).map(s => s.id), [filtered]);
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selected.has(id));

  const toggle = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => setSelected(prev => {
    if (allSelected) { const n = new Set(prev); selectableIds.forEach(id => n.delete(id)); return n; }
    return new Set([...prev, ...selectableIds]);
  });

  const send = async () => {
    if (!body.trim()) { toast.error('Xabar matnini yozing'); return; }
    if (selected.size === 0) { toast.error('Kamida bitta o\'quvchi tanlang'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'selected', studentIds: [...selected], body }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Xatolik'); return; }
      toast.success(`${d.sent} ta ota-onaga yuborildi`);
      setBody(''); setSelected(new Set());
      loadSent(); loadRecipients();
    } finally { setSending(false); }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
        <MessageSquare className="w-6 h-6 text-[var(--brand-primary)]" /> Ota-onalarga xabar
      </h1>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-200 mb-5">
        {([['send', 'Yuborish'], ['history', 'Tarix']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === k ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {label}{k === 'send' && selected.size > 0 && <span className="ml-1.5 text-xs bg-[var(--brand-primary)] text-white rounded-full px-1.5">{selected.size}</span>}
          </button>
        ))}
      </div>

      {tab === 'send' ? (
        <div className="grid lg:grid-cols-[minmax(0,340px)_1fr] gap-4 items-start">
          {/* Chap: xabar yozish */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 lg:sticky lg:top-4 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Xabar</h2>
              <p className="text-xs text-slate-400 mt-0.5">O&apos;ngdan o&apos;quvchilarni belgilang</p>
            </div>
            <div className={`rounded-lg px-3 py-2.5 text-sm font-medium ${selected.size > 0 ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : 'bg-slate-50 text-slate-400'}`}>
              {selected.size > 0 ? `${selected.size} o'quvchi tanlandi` : 'O\'quvchi tanlanmagan'}
            </div>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="Xabar matni..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{body.length} belgi</span>
              <button onClick={send} disabled={sending || selected.size === 0}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f4f88] disabled:opacity-50">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Yuborish
              </button>
            </div>
          </div>

          {/* O'ng: studentlar */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5"><Users className="w-4.5 h-4.5 text-slate-500" /> O&apos;quvchilar</h2>
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Qidirish..."
                    className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20" />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {STATUS_CHIPS.map(c => {
                  const active = statusFilter === c.value;
                  const cls = c.danger
                    ? (active ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50')
                    : (active ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]' : 'border-slate-200 text-slate-500 hover:bg-slate-50');
                  return (
                    <button key={c.value} onClick={() => setStatusFilter(c.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${cls}`}>
                      {c.label}
                    </button>
                  );
                })}
              </div>
              {/* Barchasini tanlash */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="w-4 h-4 rounded accent-[var(--brand-primary)]" disabled={selectableIds.length === 0} />
                  Barchasini tanlash <span className="text-xs text-slate-400">({filtered.length})</span>
                </label>
                {selected.size > 0 && (
                  <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-red-500">Tozalash</button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">O&apos;quvchi topilmadi</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
                {filtered.map(s => {
                  const badge = STATUS_BADGE[s.status] || STATUS_BADGE.archived;
                  const checked = selected.has(s.id);
                  return (
                    <label key={s.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      !s.hasParent ? 'opacity-50 cursor-not-allowed' : checked ? 'bg-[var(--brand-primary)]/5' : 'hover:bg-slate-50/70'}`}>
                      <input type="checkbox" checked={checked} disabled={!s.hasParent} onChange={() => toggle(s.id)}
                        className="w-4 h-4 rounded accent-[var(--brand-primary)] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800 truncate">{s.name}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                          {s.isDebtor && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Qarzdor</span>}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {s.hasParent ? `Oxirgi xabar: ${relTime(s.lastMessageAt)}` : 'Ota-ona bog\'lanmagan'}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tarix */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-2xl">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
          ) : sent.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Hali xabar yuborilmagan</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {sent.map(m => (
                <div key={m.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-800">{m.studentName} <span className="text-xs font-normal text-slate-400">ota-onasiga</span></span>
                    <span className="text-[11px] text-slate-400">{fmtDateTime(m.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{m.body}</p>
                  <span className={`text-[10px] font-semibold ${m.read ? 'text-emerald-600' : 'text-slate-400'}`}>{m.read ? 'O\'qildi' : 'Yuborildi'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
