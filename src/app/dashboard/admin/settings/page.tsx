'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, User, Lock, CheckCircle, Loader2, Save } from 'lucide-react';
import { AvatarUpload } from '@/components/avatar-upload';

interface SessionUser {
  id: string;
  name: string;
  login: string;
  role: string;
  phone?: string | null;
  avatar?: string | null;
}

interface Stats {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  activeTeachers: number;
  totalGroups: number;
  activeGroups: number;
  totalAttendance: number;
  presentAttendance: number;
}

type Msg = { type: 'success' | 'error'; text: string } | null;

export default function AdminSettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Profil (ism/telefon)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);

  // Parol
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<Msg>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
      fetch('/api/admin/stats').then(r => r.ok ? r.json() : null),
    ]).then(([userData, statsData]) => {
      if (userData?.user) {
        setUser(userData.user);
        setName(userData.user.name || '');
        setPhone(userData.user.phone || '');
      }
      if (statsData) setStats(statsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const now = new Date();
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
  ];
  const attendanceRate = stats && stats.totalAttendance > 0
    ? Math.round((stats.presentAttendance / stats.totalAttendance) * 100)
    : 0;
  const roleLabel = user?.role === 'superadmin' ? 'Super administrator' : 'Administrator';
  const dirty = user ? (name.trim() !== user.name || (phone.trim() || '') !== (user.phone || '')) : false;

  const handleProfileSave = async () => {
    if (!name.trim()) { setProfileMsg({ type: 'error', text: 'Ism kiriting' }); return; }
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      });
      if (res.ok) {
        const d = await res.json();
        setUser(u => u ? { ...u, name: d.name, phone: d.phone } : u);
        setProfileMsg({ type: 'success', text: 'Saqlandi' });
        // Header nomini darhol yangilash
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: { name: d.name } }));
      } else {
        const err = await res.json();
        setProfileMsg({ type: 'error', text: err.error || 'Xatolik yuz berdi' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Tarmoq xatoligi' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Yangi parollar mos kelmaydi' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' });
      return;
    }
    setChangingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setPasswordMsg({ type: 'success', text: 'Parol muvaffaqiyatli o\'zgartirildi' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json();
        setPasswordMsg({ type: 'error', text: err.error || 'Xatolik yuz berdi' });
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Tarmoq xatoligi' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  const inputClass = 'w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30';
  const cardCls = 'bg-white rounded-xl border border-slate-200 overflow-hidden';
  const headerCls = 'px-6 py-4 border-b border-slate-100 flex items-center gap-2';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Sozlamalar</h1>
        <div className="flex items-center gap-2 text-sm text-slate-500 border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <CalendarDays className="w-4 h-4" />
          {now.getFullYear()}-{months[now.getMonth()]}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 font-medium">O&apos;quvchilar</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats?.activeStudents ?? 0}/{stats?.totalStudents ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 font-medium">Davomat</p>
          <p className={`text-2xl font-bold mt-1 ${attendanceRate >= 80 ? 'text-emerald-600' : attendanceRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{attendanceRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 font-medium">O&apos;qituvchilar</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.activeTeachers ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500 font-medium">Guruhlar</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.activeGroups ?? 0}/{stats?.totalGroups ?? 0}</p>
        </div>
      </div>

      {/* Profil rasmi */}
      {user && (
        <div className={cardCls}>
          <div className={headerCls}>
            <User className="w-4.5 h-4.5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">Profil rasmi</h2>
          </div>
          <div className="p-6">
            <AvatarUpload avatar={user.avatar ?? null} name={user.name}
              onChange={a => setUser(u => u ? { ...u, avatar: a } : u)} />
          </div>
        </div>
      )}

      {/* Shaxsiy ma'lumotlar — tahrirlanadi */}
      <div className={cardCls}>
        <div className={headerCls}>
          <User className="w-4.5 h-4.5 text-amber-500" />
          <h2 className="text-base font-bold text-slate-900">Shaxsiy ma&apos;lumotlar</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ism familiya</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ism familiya" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Telefon</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Login</label>
              <div className="text-sm font-mono text-slate-700 bg-slate-100 px-3 py-2.5 rounded-lg">{user?.login}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
              <div className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-2.5 rounded-lg">{roleLabel}</div>
            </div>
          </div>

          {profileMsg && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {profileMsg.type === 'success' && <CheckCircle className="w-4 h-4" />}
              {profileMsg.text}
            </div>
          )}

          <button onClick={handleProfileSave} disabled={savingProfile || !dirty || !name.trim()}
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50">
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Saqlash
          </button>
        </div>
      </div>

      {/* Parolni o'zgartirish */}
      <div className={cardCls}>
        <div className={headerCls}>
          <Lock className="w-4.5 h-4.5 text-amber-500" />
          <h2 className="text-base font-bold text-slate-900">Parolni o&apos;zgartirish</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Joriy parol</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Hozirgi parolingiz" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Yangi parol</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Yangi parol (kamida 6 belgi)" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Yangi parolni tasdiqlang</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Yangi parolni qaytadan kiriting" className={inputClass} />
          </div>

          {passwordMsg && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {passwordMsg.type === 'success' && <CheckCircle className="w-4 h-4" />}
              {passwordMsg.text}
            </div>
          )}

          <button onClick={handlePasswordChange}
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50">
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Parolni saqlash
          </button>
        </div>
      </div>

      {/* Platforma */}
      <div className={cardCls}>
        <div className={headerCls}>
          <CalendarDays className="w-4.5 h-4.5 text-slate-400" />
          <h2 className="text-base font-bold text-slate-900">Platforma</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between px-6 py-3.5">
            <span className="text-sm text-slate-500">Nomi</span>
            <span className="text-sm font-semibold text-slate-900">Aka-Uka Ta&apos;lim Markazi</span>
          </div>
          <div className="flex items-center justify-between px-6 py-3.5">
            <span className="text-sm text-slate-500">Versiya</span>
            <span className="text-sm font-semibold text-slate-900">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
