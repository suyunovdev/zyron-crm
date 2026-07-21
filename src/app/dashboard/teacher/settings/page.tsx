'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Save, Loader2, CheckCircle } from 'lucide-react';

interface SessionUser {
  id: string;
  name: string;
  login: string;
  role: string;
  phone?: string;
  subject?: string;
}

export default function TeacherSettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Yangi parollar mos kelmaydi' });
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg({ type: 'error', text: 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak' });
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
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const inputClass = 'w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Sozlamalar</h1>

      {/* Profile info */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <User className="w-4.5 h-4.5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">Shaxsiy ma&apos;lumotlar</h2>
        </div>
        {user && (
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-6 py-4">
              <span className="text-sm text-slate-500">Ism familiya</span>
              <span className="text-sm font-semibold text-slate-900">{user.name}</span>
            </div>
            <div className="flex items-center justify-between px-6 py-4">
              <span className="text-sm text-slate-500">Login</span>
              <span className="text-sm font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{user.login}</span>
            </div>
            <div className="flex items-center justify-between px-6 py-4">
              <span className="text-sm text-slate-500">Rol</span>
              <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">O&apos;qituvchi</span>
            </div>
            {user.phone && (
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-slate-500">Telefon</span>
                <span className="text-sm font-semibold text-slate-900">{user.phone}</span>
              </div>
            )}
            {user.subject && (
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-slate-500">Fan</span>
                <span className="text-sm font-semibold text-slate-900">{user.subject}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Password change */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Lock className="w-4.5 h-4.5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">Parolni o&apos;zgartirish</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Joriy parol</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Hozirgi parolingiz"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Yangi parol</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Yangi parol"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Yangi parolni tasdiqlang</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Yangi parolni qaytadan kiriting"
              className={inputClass}
            />
          </div>

          {passwordMsg && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
              passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {passwordMsg.type === 'success' && <CheckCircle className="w-4 h-4" />}
              {passwordMsg.text}
            </div>
          )}

          <button
            onClick={handlePasswordChange}
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}
