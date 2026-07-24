'use client';

import { useState, useEffect, useCallback } from 'react';
import { SlidersHorizontal, BarChart3, Building2, Send, UserCog, DatabaseBackup, ShieldAlert, Skull, Loader2, Plus, Trash2, Download, UserPlus, X } from 'lucide-react';

type Tab = 'settings' | 'analytics' | 'branches' | 'broadcast' | 'impersonate' | 'backup' | 'security' | 'danger';
const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'settings', label: 'Sozlamalar', icon: SlidersHorizontal },
  { id: 'analytics', label: 'Analitika', icon: BarChart3 },
  { id: 'branches', label: 'Filiallar', icon: Building2 },
  { id: 'broadcast', label: 'Tarqatma', icon: Send },
  { id: 'impersonate', label: 'Kirish', icon: UserCog },
  { id: 'backup', label: 'Zaxira', icon: DatabaseBackup },
  { id: 'security', label: 'Xavfsizlik', icon: ShieldAlert },
  { id: 'danger', label: 'Xavfli zona', icon: Skull },
];

const fmt = (n: number) => (n || 0).toLocaleString('uz-UZ');

export default function SystemPage() {
  const [tab, setTab] = useState<Tab>('settings');
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
        <SlidersHorizontal className="w-6 h-6 text-slate-600" /> Tizim boshqaruvi
      </h1>
      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-slate-200 pb-3">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-[#2660A4] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'settings' && <SettingsTab />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'branches' && <BranchesTab />}
      {tab === 'broadcast' && <BroadcastTab />}
      {tab === 'impersonate' && <ImpersonateTab />}
      {tab === 'backup' && <BackupTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'danger' && <DangerTab />}
    </div>
  );
}

const card = 'rounded-xl border border-slate-200 bg-white p-5';
const input = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2660A4]/30';
const btn = 'flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2660A4] text-white text-sm font-medium hover:bg-[#1d4e87] disabled:opacity-60';

function SettingsTab() {
  const [s, setS] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/superadmin/settings').then(r => r.json()).then(d => { setS(d); setLoading(false); }); }, []);
  const save = async () => {
    const res = await fetch('/api/superadmin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };
  if (loading) return <Loading />;
  const fields = [
    { k: 'centerName', label: 'Markaz nomi' },
    { k: 'defaultPrice', label: 'Standart kurs narxi (so\'m)' },
    { k: 'defaultLessonsPerMonth', label: 'Oyiga darslar (standart)' },
    { k: 'defaultSalaryShare', label: 'Ustoz standart ulushi (%)' },
    { k: 'currency', label: 'Valyuta' },
  ];
  return (
    <div className={card}>
      <div className="space-y-3 max-w-md">
        {fields.map(f => (
          <div key={f.k}>
            <label className="text-xs font-medium text-slate-500">{f.label}</label>
            <input className={input} value={s[f.k] ?? ''} onChange={e => setS(p => ({ ...p, [f.k]: e.target.value }))} />
          </div>
        ))}
        <button onClick={save} className={btn}>{saved ? 'Saqlandi ✓' : 'Saqlash'}</button>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { fetch('/api/superadmin/analytics').then(r => r.json()).then(setD); }, []);
  if (!d) return <Loading />;
  const maxRev = Math.max(...d.revenueTrend.map((r: any) => r.revenue), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: '6 oy tushum', v: fmt(d.totalRevenue6m) },
          { l: 'Qarzdorlik', v: fmt(d.totalDebt) },
          { l: 'Faol o\'quvchi', v: d.activeStudents },
          { l: 'Faol guruh', v: d.totalGroups },
        ].map(x => (
          <div key={x.l} className={card}><p className="text-xs text-slate-500">{x.l}</p><p className="text-xl font-bold text-slate-900">{x.v}</p></div>
        ))}
      </div>
      <div className={card}>
        <p className="text-sm font-semibold text-slate-700 mb-3">Tushum trendi (6 oy)</p>
        <div className="flex items-end gap-2 h-32">
          {d.revenueTrend.map((r: any) => (
            <div key={r.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-[#2660A4] rounded-t" style={{ height: `${(r.revenue / maxRev) * 100}%`, minHeight: 2 }} />
              <span className="text-[9px] text-slate-400">{r.month.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={card}>
        <p className="text-sm font-semibold text-slate-700 mb-2">Top ustozlar (tushum)</p>
        {d.topTeachers.map((t: any, i: number) => (
          <div key={i} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0 text-sm">
            <span className="text-slate-700">{t.name}</span><span className="font-medium text-slate-900">{fmt(t.revenue)} so’m</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchesTab() {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [adminFor, setAdminFor] = useState<{ id: string; name: string } | null>(null);
  const load = useCallback(() => fetch('/api/superadmin/branches').then(r => r.json()).then(d => setList(d.branches)), []);
  useEffect(() => { load(); }, [load]);
  const add = async () => { if (!name) return; await fetch('/api/superadmin/branches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); setName(''); load(); };
  const del = async (id: string) => { if (!confirm('Filialni o\'chirasizmi?')) return; await fetch(`/api/superadmin/branches/${id}`, { method: 'DELETE' }); load(); };
  return (
    <div className="space-y-4">
      <div className={`${card} flex gap-2`}>
        <input className={input} placeholder="Yangi filial nomi" value={name} onChange={e => setName(e.target.value)} />
        <button onClick={add} className={btn}><Plus className="w-4 h-4" /> Qo’shish</button>
      </div>
      <div className={card}>
        {list.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Filial yo’q</p> :
          list.map(b => (
            <div key={b.id} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 gap-3">
              <div className="min-w-0"><p className="font-medium text-slate-800 truncate">{b.name}</p><p className="text-xs text-slate-400">{b._count.users} xodim • {b._count.groups} guruh</p></div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setAdminFor({ id: b.id, name: b.name })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2660A4]/10 text-[#2660A4] text-xs font-medium hover:bg-[#2660A4]/20">
                  <UserPlus className="w-3.5 h-3.5" /> Admin qo’shish
                </button>
                <button onClick={() => del(b.id)} className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
      </div>
      {adminFor && <BranchAdminModal branch={adminFor} onClose={() => setAdminFor(null)} onCreated={() => { setAdminFor(null); load(); }} />}
    </div>
  );
}

function BranchAdminModal({ branch, onClose, onCreated }: { branch: { id: string; name: string }; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', login: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [creds, setCreds] = useState<{ login: string; password: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setErr('');
    if (!form.name || !form.login || form.password.length < 4) { setErr('Ism, login va parol (kamida 4 belgi)'); return; }
    setSaving(true);
    const res = await fetch('/api/superadmin/admins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: 'admin', branchId: branch.id }),
    });
    setSaving(false);
    if (!res.ok) { setErr((await res.json()).error || 'Xato'); return; }
    setCreds({ login: form.login, password: form.password });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Building2 className="w-5 h-5 text-[#2660A4]" /> {branch.name} — admin</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        {creds ? (
          <div className="px-6 py-5 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center mb-2 text-lg">✅</div>
            <p className="font-semibold text-slate-900 mb-3">Admin yaratildi</p>
            <div className="rounded-xl border border-slate-200 text-left">
              <div className="flex justify-between px-4 py-2.5 border-b border-slate-100"><span className="text-sm text-slate-500">Login</span><span className="font-mono font-semibold">{creds.login}</span></div>
              <div className="flex justify-between px-4 py-2.5"><span className="text-sm text-slate-500">Parol</span><span className="font-mono font-semibold">{creds.password}</span></div>
            </div>
            <button onClick={onCreated} className="w-full mt-4 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700">Yopish</button>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 space-y-3">
              {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</div>}
              {([['name', 'To\'liq ism'], ['login', 'Login'], ['phone', 'Telefon (ixtiyoriy)'], ['password', 'Parol']] as const).map(([k, label]) => (
                <div key={k}>
                  <label className="text-xs font-medium text-slate-500">{label}</label>
                  <input value={form[k]} onChange={e => setForm(s => ({ ...s, [k]: e.target.value }))} className={input} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Bekor</button>
              <button onClick={submit} disabled={saving} className={btn}>{saving && <Loader2 className="w-4 h-4 animate-spin" />} Yaratish</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BroadcastTab() {
  const [msg, setMsg] = useState('');
  const [audience, setAudience] = useState('students');
  const [channel, setChannel] = useState('sms');
  const [result, setResult] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => { fetch('/api/superadmin/broadcast').then(r => r.json()).then(d => setReady(d.gatewayReady)); }, []);
  const send = async () => {
    if (!msg) return;
    const res = await fetch('/api/superadmin/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, audience, channel }) });
    const d = await res.json();
    setResult(res.ok ? `${d.recipientCount} ta qabul qiluvchi — holat: ${d.status}` : d.error);
  };
  return (
    <div className={card}>
      {!ready && <div className="text-xs bg-amber-50 text-amber-700 rounded-lg px-3 py-2 mb-3">SMS gateway (SMS_GATEWAY_TOKEN) sozlanmagan — xabar navbatga qo’yiladi (yuborilmaydi).</div>}
      <div className="space-y-3 max-w-md">
        <div className="flex gap-2">
          <select className={input} value={audience} onChange={e => setAudience(e.target.value)}>
            <option value="students">O’quvchilar</option><option value="debtors">Qarzdorlar</option><option value="leads">Lidlar</option><option value="all">Hammasi</option>
          </select>
          <select className={input} value={channel} onChange={e => setChannel(e.target.value)}>
            <option value="sms">SMS</option><option value="telegram">Telegram</option>
          </select>
        </div>
        <textarea className={input} rows={4} placeholder="Xabar matni..." value={msg} onChange={e => setMsg(e.target.value)} />
        <button onClick={send} className={btn}><Send className="w-4 h-4" /> Yuborish</button>
        {result && <p className="text-sm text-slate-600">{result}</p>}
      </div>
    </div>
  );
}

function ImpersonateTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [sel, setSel] = useState('');
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users?role=teacher&limit=100').then(r => r.json()),
      fetch('/api/admin/users?role=student&limit=100').then(r => r.json()),
    ]).then(([t, s]) => setUsers([...(t.data || []), ...(s.data || [])]));
  }, []);
  const go = async () => {
    if (!sel) return;
    const res = await fetch('/api/superadmin/impersonate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId: sel }) });
    const d = await res.json();
    if (res.ok) window.location.href = d.redirect; else alert(d.error);
  };
  return (
    <div className={card}>
      <p className="text-sm text-slate-500 mb-3">Boshqa foydalanuvchi sifatida kirib, ularning ko’rinishini tekshiring (support/debug). Qaytish tugmasi tepada chiqadi.</p>
      <div className="flex gap-2 max-w-md">
        <select className={input} value={sel} onChange={e => setSel(e.target.value)}>
          <option value="">Foydalanuvchi tanlang...</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
        </select>
        <button onClick={go} className={btn}><UserCog className="w-4 h-4" /> Kirish</button>
      </div>
    </div>
  );
}

function BackupTab() {
  const [msg, setMsg] = useState('');
  const backup = async () => {
    const res = await fetch('/api/superadmin/backup', { method: 'POST' });
    const d = await res.json();
    setMsg(res.ok ? `Zaxira yaratildi: ${d.file}` : d.error);
  };
  return (
    <div className="space-y-4">
      <div className={card}>
        <p className="text-sm font-semibold text-slate-700 mb-1">Ma’lumot zaxirasi</p>
        <p className="text-xs text-slate-500 mb-3">SQLite bazasining nusxasini serverdagi backups/ papkasiga saqlaydi.</p>
        <button onClick={backup} className={btn}><DatabaseBackup className="w-4 h-4" /> Zaxira yaratish</button>
        {msg && <p className="text-sm text-slate-600 mt-2">{msg}</p>}
      </div>
      <div className={card}>
        <p className="text-sm font-semibold text-slate-700 mb-1">To’liq eksport (JSON)</p>
        <p className="text-xs text-slate-500 mb-3">Barcha ma’lumotni JSON fayl sifatida yuklab olish.</p>
        <a href="/api/superadmin/export" className={`${btn} inline-flex w-fit`}><Download className="w-4 h-4" /> Eksport qilish</a>
      </div>
    </div>
  );
}

function SecurityTab() {
  const [msg, setMsg] = useState('');
  const forceAll = async () => {
    if (!confirm('Barcha foydalanuvchilarni tizimdan chiqarasizmi? Ular qayta login qilishi kerak bo\'ladi.')) return;
    const res = await fetch('/api/superadmin/security', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'force-logout-all' }) });
    const d = await res.json();
    setMsg(res.ok ? `${d.affected} foydalanuvchi chiqarildi` : d.error);
  };
  return (
    <div className={card}>
      <p className="text-sm font-semibold text-slate-700 mb-1">Majburiy chiqarish (barcha sessiyalar)</p>
      <p className="text-xs text-slate-500 mb-3">Barcha eski tokenlarni bekor qiladi — o’g’irlangan/eskirgan sessiyalarga qarshi.</p>
      <button onClick={forceAll} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700">
        <ShieldAlert className="w-4 h-4" /> Hammani chiqarish
      </button>
      {msg && <p className="text-sm text-slate-600 mt-2">{msg}</p>}
    </div>
  );
}

function DangerTab() {
  const [msg, setMsg] = useState('');
  const run = async (action: string, label: string) => {
    if (!confirm(`"${label}" — bu qaytarib bo’lmaydi. Davom etasizmi?`)) return;
    const res = await fetch('/api/superadmin/danger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, confirm: 'TASDIQLAYMAN' }) });
    const d = await res.json();
    setMsg(res.ok ? `${d.label}: ${d.deleted} ta o’chirildi` : d.error);
  };
  const actions = [
    { a: 'clear-rejected-leads', l: 'Rad etilgan lidlarni tozalash' },
    { a: 'clear-read-notifications', l: 'O\'qilgan bildirishnomalarni tozalash' },
    { a: 'clear-old-audit', l: '90 kundan eski audit yozuvlarini tozalash' },
  ];
  return (
    <div className={`${card} border-red-200`}>
      <p className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-1.5"><Skull className="w-4 h-4" /> Xavfli zona</p>
      <div className="space-y-2">
        {actions.map(x => (
          <div key={x.a} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
            <span className="text-sm text-slate-700">{x.l}</span>
            <button onClick={() => run(x.a, x.l)} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50">Tozalash</button>
          </div>
        ))}
      </div>
      {msg && <p className="text-sm text-slate-600 mt-3">{msg}</p>}
    </div>
  );
}

function Loading() { return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#2660A4]" /></div>; }
