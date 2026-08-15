'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Send, Search, Users, FolderOpen, UserRound, Loader2 } from 'lucide-react';
import { toast } from '@/components/toast';
import { fmtDateTime } from '@/lib/date';

interface Student { id: string; name: string; phone?: string }
interface Group { id: string; name: string; subject: string; _count?: { students: number } }
interface Sent { id: string; studentName: string; body: string; createdAt: string; read: boolean }

type Mode = 'single' | 'group' | 'all';
type Segment = 'active' | 'frozen' | 'archived' | 'debtors' | 'all';

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'active', label: 'Faol o\'quvchilar' },
  { value: 'frozen', label: 'Muzlatilganlar' },
  { value: 'archived', label: 'Arxivlanganlar' },
  { value: 'debtors', label: 'Qarzdorlar' },
  { value: 'all', label: 'Barcha o\'quvchilar' },
];

export default function AdminMessagesPage() {
  const [mode, setMode] = useState<Mode>('single');
  const [segment, setSegment] = useState<Segment>('active');
  const [body, setBody] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Sent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSent = () => fetch('/api/admin/messages').then(r => r.ok ? r.json() : { messages: [] }).then(d => setSent(d.messages || []));

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users?role=student&limit=1000').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/admin/groups').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/messages').then(r => r.ok ? r.json() : { messages: [] }),
    ]).then(([s, g, m]) => {
      setStudents(Array.isArray(s?.data) ? s.data : []);
      setGroups(Array.isArray(g) ? g : (g.groups || []));
      setSent(m.messages || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const selectedStudent = students.find(s => s.id === studentId);
  const searchResults = search.trim()
    ? students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone || '').includes(search)).slice(0, 8)
    : [];

  const send = async () => {
    if (!body.trim()) { toast.error('Xabar matnini yozing'); return; }
    if (mode === 'single' && !studentId) { toast.error('O\'quvchini tanlang'); return; }
    if (mode === 'group' && !groupId) { toast.error('Guruhni tanlang'); return; }
    if (mode === 'all') {
      const segLabel = SEGMENTS.find(s => s.value === segment)?.label.toLowerCase() || '';
      if (!confirm(`"${segLabel}" ota-onasiga yuborilsinmi?`)) return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, body, studentId: studentId || undefined, groupId: groupId || undefined, status: mode === 'all' ? segment : undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Xatolik'); return; }
      toast.success(`${d.sent} ta ota-onaga yuborildi`);
      setBody(''); setStudentId(''); setSearch(''); setGroupId('');
      loadSent();
    } finally { setSending(false); }
  };

  const MODES: { key: Mode; label: string; icon: typeof Users }[] = [
    { key: 'single', label: 'Bitta o\'quvchi', icon: UserRound },
    { key: 'group', label: 'Guruh', icon: FolderOpen },
    { key: 'all', label: 'Barcha', icon: Users },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-[#2660A4]" /> Ota-onalarga xabar
      </h1>

      {/* Compose */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        {/* Rejim */}
        <div className="grid grid-cols-3 gap-2">
          {MODES.map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                mode === m.key ? 'border-[#2660A4] bg-[#2660A4]/5 text-[#2660A4]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <m.icon className="w-5 h-5" /> {m.label}
            </button>
          ))}
        </div>

        {/* Qabul qiluvchi */}
        {mode === 'single' && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">O&apos;quvchi</label>
            {selectedStudent ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                <span className="text-sm font-medium text-slate-800">{selectedStudent.name}</span>
                <button onClick={() => { setStudentId(''); setSearch(''); }} className="text-xs text-slate-400 hover:text-red-500">O&apos;zgartirish</button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ism yoki telefon bo'yicha qidiring..."
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2660A4]/20" />
                {search.trim() && (
                  <div className="mt-1.5 rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {searchResults.length === 0 ? <p className="text-sm text-slate-400 text-center py-3">Topilmadi</p> :
                      searchResults.map(s => (
                        <button key={s.id} onClick={() => { setStudentId(s.id); setSearch(''); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-slate-50 text-sm text-slate-700">
                          {s.name} {s.phone && <span className="text-xs text-slate-400">· {s.phone}</span>}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {mode === 'group' && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Guruh</label>
            <select value={groupId} onChange={e => setGroupId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2660A4]/20">
              <option value="">Tanlang...</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} — {g.subject} ({g._count?.students ?? 0})</option>)}
            </select>
          </div>
        )}
        {mode === 'all' && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Segment (holat)</label>
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map(s => (
                <button key={s.value} type="button" onClick={() => setSegment(s.value)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    segment === s.value ? 'border-[#2660A4] bg-[#2660A4]/5 text-[#2660A4]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {segment === 'debtors' ? 'Pul qarzi bor o\'quvchilar' : SEGMENTS.find(s => s.value === segment)?.label}ning ota-onasiga yuboriladi.
            </p>
          </div>
        )}

        {/* Matn */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Xabar</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Xabar matni..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2660A4]/20" />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{body.length} belgi</span>
          <button onClick={send} disabled={sending}
            className="flex items-center gap-1.5 rounded-lg bg-[#2660A4] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1f4f88] disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Yuborish
          </button>
        </div>
      </div>

      {/* Yuborilgan tarix */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Yuborilgan xabarlar</h2>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
        ) : sent.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Hali xabar yuborilmagan</p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
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
    </div>
  );
}
