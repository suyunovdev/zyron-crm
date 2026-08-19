'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/toast';
import { confirmDialog } from '@/components/confirm-dialog';
import { ShieldCheck, Shield, Plus, X, KeyRound, Snowflake, UserCheck, Trash2, Loader2, Eye, EyeOff, Building2 } from 'lucide-react';
import { SkeletonCards } from '@/components/skeleton';

interface Branch { id: string; name: string }
interface Admin {
  id: string;
  login: string;
  name: string;
  phone: string | null;
  role: 'admin' | 'superadmin';
  status: string;
  rawPass: string | null;
  branch: Branch | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = { active: 'Faol', frozen: 'Muzlatilgan', archived: 'Arxiv' };

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState('');
  const [editCred, setEditCred] = useState<Admin | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/admins');
      if (!res.ok) throw new Error('yuklashda xato');
      const d = await res.json();
      setAdmins(d.admins);
      setBranches(d.branches || []);
      setCurrentUserId(d.currentUserId);
    } catch {
      setError('Ma\'lumotni yuklab bo\'lmadi');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (a: Admin) => {
    setBusy(a.id);
    const next = a.status === 'active' ? 'frozen' : 'active';
    const res = await fetch(`/api/superadmin/admins/${a.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) { const e = await res.json(); toast.error(e.error || 'Xato'); }
    await load();
    setBusy('');
  };


  const changeRole = async (a: Admin) => {
    const next = a.role === 'superadmin' ? 'admin' : 'superadmin';
    if (!(await confirmDialog(`${a.name} rolini "${next}" ga o'zgartirasizmi?`, { confirmText: "O'zgartirish" }))) return;
    setBusy(a.id);
    const res = await fetch(`/api/superadmin/admins/${a.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: next }),
    });
    if (!res.ok) { const e = await res.json(); toast.error(e.error || 'Xato'); }
    await load();
    setBusy('');
  };

  const remove = async (a: Admin) => {
    if (!(await confirmDialog(`${a.name} adminini o'chirasizmi? Bu qaytarib bo'lmaydi.`, { danger: true, confirmText: "O'chirish" }))) return;
    setBusy(a.id);
    const res = await fetch(`/api/superadmin/admins/${a.id}`, { method: 'DELETE' });
    if (!res.ok) { const e = await res.json(); toast.error(e.error || 'Xato'); }
    await load();
    setBusy('');
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" /> Adminlar
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Admin va superadmin akkauntlarini boshqarish</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:bg-[var(--brand-primary-dark)] transition-colors"
        >
          <Plus className="w-4 h-4" /> Yangi admin
        </button>
      </div>

      {loading ? (
        <SkeletonCards count={4} cols={2} />
      ) : error ? (
        <div className="text-center py-12 text-sm text-red-500">{error}</div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Ism</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Login / Parol</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500">Rol</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-slate-500">Holat</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(a => {
                  const isSelf = a.id === currentUserId;
                  return (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{a.name}</span>
                          {isSelf && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Siz</span>}
                        </div>
                        {a.branch && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" /> {a.branch.name}</p>
                        )}
                        {a.phone && <p className="text-xs text-slate-400">{a.phone}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-slate-700">{a.login}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span className="font-mono">{showPass[a.id] ? (a.rawPass || '—') : '••••••'}</span>
                          <button onClick={() => setShowPass(p => ({ ...p, [a.id]: !p[a.id] }))} className="hover:text-slate-600">
                            {showPass[a.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          a.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {a.role === 'superadmin' ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          {a.role === 'superadmin' ? 'Superadmin' : 'Admin'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>{STATUS_LABELS[a.status] || a.status}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          {busy === a.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          ) : (
                            <>
                              <button onClick={() => setEditCred(a)} title="Login/parolni tahrirlash"
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[var(--brand-primary)]">
                                <KeyRound className="w-4 h-4" />
                              </button>
                              <button onClick={() => changeRole(a)} title="Rolni o'zgartirish"
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-purple-600">
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                              {!isSelf && (
                                <>
                                  <button onClick={() => toggleStatus(a)} title={a.status === 'active' ? 'Muzlatish' : 'Faollashtirish'}
                                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600">
                                    {a.status === 'active' ? <Snowflake className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                  </button>
                                  <button onClick={() => remove(a)} title="O'chirish"
                                    className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && <CreateAdminModal branches={branches} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {editCred && <CredEditModal admin={editCred} onClose={() => setEditCred(null)} onSaved={() => { setEditCred(null); load(); }} />}
    </div>
  );
}

// Login + parolni tahrirlash (superadmin)
function CredEditModal({ admin, onClose, onSaved }: { admin: Admin; onClose: () => void; onSaved: () => void }) {
  const [login, setLogin] = useState(admin.login);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!login.trim()) { toast.error('Login bo\'sh bo\'lmasin'); return; }
    if (password && password.length < 4) { toast.error('Parol kamida 4 belgi'); return; }
    const body: Record<string, string> = {};
    if (login.trim() !== admin.login) body.login = login.trim();
    if (password) body.password = password;
    if (Object.keys(body).length === 0) { onClose(); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/admins/${admin.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Xatolik'); return; }
      toast.success('Saqlandi');
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Login / parol</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3.5">
          <p className="text-xs text-slate-500">{admin.name}</p>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Login</label>
            <input value={login} onChange={e => setLogin(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Yangi parol (ixtiyoriy)</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="O'zgartirmaslik uchun bo'sh qoldiring"
                className="w-full rounded-lg border border-slate-200 px-3 pr-10 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end px-5 py-3 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Bekor</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f4f88] disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateAdminModal({ branches, onClose, onCreated }: { branches: Branch[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', login: '', phone: '', password: '', role: 'admin' as 'admin' | 'superadmin', branchId: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setErr('');
    if (!form.name || !form.login || form.password.length < 4) {
      setErr('Ism, login va parol (kamida 4 belgi) to\'ldiring');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/superadmin/admins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, branchId: form.branchId || undefined }),
    });
    setSaving(false);
    if (!res.ok) { const e = await res.json(); setErr(e.error || 'Xato'); return; }
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl shadow-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Yangi admin</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {err && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</div>}
          {([
            { k: 'name', label: 'To\'liq ism', type: 'text' },
            { k: 'login', label: 'Login', type: 'text' },
            { k: 'phone', label: 'Telefon (ixtiyoriy)', type: 'text' },
            { k: 'password', label: 'Parol', type: 'text' },
          ] as const).map(f => (
            <div key={f.k}>
              <label className="text-xs font-medium text-slate-500">{f.label}</label>
              <input
                type={f.type}
                value={form[f.k]}
                onChange={e => setForm(s => ({ ...s, [f.k]: e.target.value }))}
                className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-slate-500">Rol</label>
            <select
              value={form.role}
              onChange={e => setForm(s => ({ ...s, role: e.target.value as 'admin' | 'superadmin' }))}
              className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
          {form.role === 'admin' && (
            <div>
              <label className="text-xs font-medium text-slate-500">Filial (ixtiyoriy)</label>
              <select
                value={form.branchId}
                onChange={e => setForm(s => ({ ...s, branchId: e.target.value }))}
                className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
              >
                <option value="">— Filialsiz —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {branches.length === 0 && <p className="text-[11px] text-amber-600 mt-1">Filial yo&apos;q — avval Tizim → Filiallar bo&apos;limida yarating.</p>}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Bekor</button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:bg-[var(--brand-primary-dark)] disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Yaratish
          </button>
        </div>
      </div>
    </div>
  );
}
