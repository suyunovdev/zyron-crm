'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Loader2, Check } from 'lucide-react';
import { fmtDateTime } from '@/lib/date';

interface StudentOpt { id: string; name: string; groupName: string }
interface Msg { id: string; studentName: string; body: string; read: boolean; createdAt: string }

export default function TeacherMessagesPage() {
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [studentId, setStudentId] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(() => {
    fetch('/api/teacher/messages').then(r => r.ok ? r.json() : { messages: [] }).then(d => setMessages(d.messages || []));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/teacher/groups').then(r => r.ok ? r.json() : []),
      fetch('/api/teacher/messages').then(r => r.ok ? r.json() : { messages: [] }),
    ]).then(([groups, msgs]) => {
      const opts: StudentOpt[] = [];
      (Array.isArray(groups) ? groups : []).forEach((g: any) => {
        (g.students || []).forEach((gs: any) => {
          if (gs.student) opts.push({ id: gs.student.id, name: gs.student.name, groupName: g.name });
        });
      });
      // takroriy o'quvchini olib tashlash (bir nechta guruhda bo'lsa ham bitta)
      const seen = new Set<string>();
      setStudents(opts.filter(o => !seen.has(o.id) && seen.add(o.id)));
      setMessages(msgs.messages || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const send = async () => {
    setErr(''); setSent(false);
    if (!studentId) { setErr('O\'quvchini tanlang'); return; }
    if (!body.trim()) { setErr('Xabar matnini yozing'); return; }
    setSending(true);
    const res = await fetch('/api/teacher/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, body: body.trim() }),
    });
    setSending(false);
    if (!res.ok) { setErr((await res.json()).error || 'Xato'); return; }
    setBody(''); setSent(true); loadMessages();
    setTimeout(() => setSent(false), 2500);
  };

  if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="w-7 h-7 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-blue-500" /> Xabarlar
      </h1>

      {/* Yozish */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ota-onaga xabar yuborish</p>
        {err && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{err}</div>}
        {sent && <div className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2 flex items-center gap-1.5"><Check className="w-4 h-4" /> Xabar yuborildi</div>}
        <div>
          <label className="text-xs font-medium text-slate-500">O&apos;quvchi</label>
          <select value={studentId} onChange={e => setStudentId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">Tanlang...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.groupName}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Xabar</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Masalan: Farzandingiz bugun darsga kelmadi..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <button onClick={send} disabled={sending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Yuborish
        </button>
      </div>

      {/* Yuborilganlar */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Yuborilgan xabarlar</h2>
        {messages.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center text-sm text-slate-400">
            Hali xabar yuborilmagan
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(m => (
              <div key={m.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{m.studentName}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    m.read ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}>{m.read ? 'O\'qildi' : 'Yuborildi'}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{m.body}</p>
                <p className="text-xs text-slate-400 mt-2">{fmtDateTime(m.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
