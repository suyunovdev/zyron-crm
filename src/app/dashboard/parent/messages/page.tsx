'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { fmtDateTime } from '@/lib/date';

interface Msg { id: string; teacherName: string; studentName: string; body: string; read: boolean; createdAt: string }

export default function ParentMessagesPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/parent/messages').then(r => r.ok ? r.json() : { messages: [] }).then(d => {
      setMessages(d.messages || []);
      setLoading(false);
      // Ko'rilgach o'qilgan deb belgilaymiz (badge tozalanadi)
      if ((d.messages || []).some((m: Msg) => !m.read)) {
        fetch('/api/parent/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) });
      }
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="w-7 h-7 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-blue-500" /> Xabarlar
      </h1>

      {messages.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">Hozircha xabar yo&apos;q</p>
          <p className="text-xs text-slate-400 mt-1">Ustoz xabar yozganda shu yerda ko&apos;rinadi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(m => (
            <div key={m.id} className={`rounded-2xl border p-4 ${
              m.read
                ? 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                : 'bg-blue-50/60 dark:bg-blue-900/15 border-blue-200 dark:border-blue-800/40'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{m.teacherName}</span>
                {!m.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-none" />}
              </div>
              <p className="text-[11px] text-slate-400 mb-2">{m.studentName} haqida</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{m.body}</p>
              <p className="text-xs text-slate-400 mt-2">{fmtDateTime(m.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
