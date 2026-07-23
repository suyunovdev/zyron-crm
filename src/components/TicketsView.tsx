'use client';

import { useState, useEffect, useCallback } from 'react';
import { Ticket as TicketIcon, Plus, X, Send, ArrowLeft, Loader2, CircleDot } from 'lucide-react';
import { CATEGORY_LABELS, STATUS_LABELS, TICKET_CATEGORIES } from '@/lib/tickets';

interface TicketListItem {
  id: string; subject: string; category: string; priority: string; status: string;
  recipientType: string; relatedStudentName: string | null; authorName: string;
  updatedAt: string; messageCount: number; lastMessage: string; unread: boolean;
}
interface Message { id: string; senderName: string; senderRole: string; body: string; createdAt: string; }
interface TicketDetail extends TicketListItem { messages: Message[]; myRole: 'author' | 'recipient'; }

const STATUS_CLS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700', in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700', closed: 'bg-slate-100 text-slate-500',
};
const PRIORITY_CLS: Record<string, string> = {
  low: 'text-slate-400', normal: 'text-slate-500', high: 'text-red-600 font-semibold',
};
const timeAgo = (s: string) => new Date(s).toLocaleString('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function TicketsView({ canCreate = false }: { canCreate?: boolean }) {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [active, setActive] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/tickets');
    if (res.ok) setTickets((await res.json()).tickets);
    setLoading(false);
  }, []);
  useEffect(() => { loadList(); }, [loadList]);

  const openTicket = async (id: string) => {
    const res = await fetch(`/api/tickets/${id}`);
    if (res.ok) { setActive(await res.json()); loadList(); }
  };

  if (active) return <ThreadView ticket={active} onBack={() => { setActive(null); loadList(); }} onChange={() => openTicket(active.id)} />;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <TicketIcon className="w-6 h-6 text-[#2660A4]" /> Ticketlar
        </h1>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2660A4] text-white text-sm font-medium hover:bg-[#1d4e87]">
            <Plus className="w-4 h-4" /> Yangi ticket
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#2660A4]" /></div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-400">Ticket yo&apos;q</div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <button key={t.id} onClick={() => openTicket(t.id)}
              className={`w-full text-left rounded-xl border bg-white p-4 hover:border-[#2660A4]/40 transition-colors ${t.unread ? 'border-[#2660A4]/50' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {t.unread && <CircleDot className="w-3.5 h-3.5 text-[#2660A4] shrink-0" />}
                    <span className="font-semibold text-slate-800 truncate">{t.subject}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{t.lastMessage}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100">{CATEGORY_LABELS[t.category] || t.category}</span>
                    <span>→ {t.recipientType === 'admin' ? 'Admin' : (t.relatedStudentName ? `${t.relatedStudentName} ota-onasi` : 'Ota-ona')}</span>
                    {t.priority === 'high' && <span className="text-red-600 font-semibold">Muhim</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(t.updatedAt)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadList(); }} />}
    </div>
  );
}

function ThreadView({ ticket, onBack, onChange }: { ticket: TicketDetail; onBack: () => void; onChange: () => void }) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const canStatus = ticket.myRole === 'author' || (ticket.myRole === 'recipient' && ticket.recipientType === 'admin');

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    const res = await fetch(`/api/tickets/${ticket.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: reply }) });
    setSending(false);
    if (res.ok) { setReply(''); onChange(); }
  };
  const setStatus = async (status: string) => {
    await fetch(`/api/tickets/${ticket.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    onChange();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Orqaga
      </button>
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{ticket.subject}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span className="px-1.5 py-0.5 rounded bg-slate-100">{CATEGORY_LABELS[ticket.category]}</span>
              <span>→ {ticket.recipientType === 'admin' ? 'Admin' : (ticket.relatedStudentName ? `${ticket.relatedStudentName} ota-onasi` : 'Ota-ona')}</span>
            </div>
          </div>
          {canStatus ? (
            <select value={ticket.status} onChange={e => setStatus(e.target.value)}
              className={`text-xs font-semibold px-2 py-1 rounded-lg border-0 ${STATUS_CLS[ticket.status]}`}>
              {['open', 'in_progress', 'resolved', 'closed'].map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          ) : (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[ticket.status]}`}>{STATUS_LABELS[ticket.status]}</span>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {ticket.messages.map(m => {
          const mine = m.senderRole === 'teacher' && ticket.myRole === 'author';
          const fromTeacher = m.senderRole === 'teacher';
          return (
            <div key={m.id} className={`flex ${(ticket.myRole === 'author' ? fromTeacher : !fromTeacher) ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${(ticket.myRole === 'author' ? fromTeacher : !fromTeacher) ? 'bg-[#2660A4] text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                <p className="text-[11px] opacity-70 mb-0.5">{m.senderName} • {timeAgo(m.createdAt)}</p>
                <p className="text-sm whitespace-pre-wrap">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 items-end sticky bottom-0 bg-transparent">
        <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Javob yozing..."
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2660A4]/30" />
        <button onClick={send} disabled={sending || !reply.trim()}
          className="p-3 rounded-lg bg-[#2660A4] text-white hover:bg-[#1d4e87] disabled:opacity-50">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [recipientType, setRecipientType] = useState<'admin' | 'parent'>('admin');
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [studentId, setStudentId] = useState('');
  const [category, setCategory] = useState('other');
  const [priority, setPriority] = useState('normal');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/teacher/groups').then(r => r.ok ? r.json() : []).then((groups: any[]) => {
      const map = new Map<string, string>();
      (Array.isArray(groups) ? groups : []).forEach(g => (g.students || []).forEach((gs: any) => map.set(gs.student.id, gs.student.name)));
      setStudents([...map.entries()].map(([id, name]) => ({ id, name })));
    }).catch(() => {});
  }, []);

  const submit = async () => {
    setErr('');
    if (!subject.trim() || !message.trim()) { setErr('Mavzu va xabar to\'ldiring'); return; }
    if (recipientType === 'parent' && !studentId) { setErr('O\'quvchini tanlang'); return; }
    setSaving(true);
    const res = await fetch('/api/tickets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientType, studentId: studentId || undefined, category, priority, subject, message }),
    });
    setSaving(false);
    if (!res.ok) { setErr((await res.json()).error || 'Xato'); return; }
    onCreated();
  };

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2660A4]/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl shadow-2xl border border-slate-200 bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Yangi ticket</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className="text-xs font-medium text-slate-500">Kimga</label>
            <div className="flex gap-2 mt-1">
              {(['admin', 'parent'] as const).map(rt => (
                <button key={rt} onClick={() => setRecipientType(rt)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${recipientType === rt ? 'border-[#2660A4] bg-[#2660A4]/5 text-[#2660A4] font-medium' : 'border-slate-200 text-slate-600'}`}>
                  {rt === 'admin' ? 'Admin' : 'Ota-ona'}
                </button>
              ))}
            </div>
          </div>
          {recipientType === 'parent' && (
            <div>
              <label className="text-xs font-medium text-slate-500">O&apos;quvchi (ota-onasiga boradi)</label>
              <select className={inputCls} value={studentId} onChange={e => setStudentId(e.target.value)}>
                <option value="">Tanlang...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500">Kategoriya</label>
              <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
                {TICKET_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500">Muhimlik</label>
              <select className={inputCls} value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="low">Past</option><option value="normal">Normal</option><option value="high">Yuqori</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Mavzu</label>
            <input className={inputCls} value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Xabar</label>
            <textarea className={inputCls} rows={4} value={message} onChange={e => setMessage(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Bekor</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2660A4] text-white text-sm font-medium hover:bg-[#1d4e87] disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Yuborish
          </button>
        </div>
      </div>
    </div>
  );
}
