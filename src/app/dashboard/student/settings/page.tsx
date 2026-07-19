'use client';

import { useState, useEffect } from 'react';
import { User, Phone, Hash, Shield } from 'lucide-react';

interface SessionUser {
  id: string;
  name: string;
  login: string;
  role: string;
}

export default function StudentSettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, []);

  const fields = user
    ? [
        { label: 'Ism', value: user.name, icon: User },
        { label: 'Login', value: user.login, icon: Hash },
        { label: 'Rol', value: "O'quvchi", icon: Shield },
      ]
    : [];

  return (
    <>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sozlamalar</h1>
          <p className="text-slate-500 mt-1">Profil ma&apos;lumotlari</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <User className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-900">Shaxsiy ma&apos;lumotlar</h3>
          </div>

          {loading ? (
            <div className="p-6 space-y-4 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
                  <div className="h-11 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {fields.map(field => (
                <div key={field.label}>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <field.icon className="w-4 h-4 text-slate-400" />
                    {field.label}
                  </label>
                  <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-medium select-all">
                    {field.value}
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-slate-400" />
                  Telefon
                </label>
                <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-sm italic">
                  Ko&apos;rsatilmagan
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <p className="text-sm text-blue-700 font-medium">
            Ma&apos;lumotlarni o&apos;zgartirish uchun administrator bilan bog&apos;laning.
          </p>
        </div>
      </div>
    </>
  );
}
