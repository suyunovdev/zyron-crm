'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, ShieldCheck, Users, UsersRound } from 'lucide-react';
import Image from 'next/image';

// Subdomen bo'yicha auditoriya matni:
//  crm.* → xodimlar (admin, o'qituvchi) · my.* → o'quvchi va ota-ona
const COPY = {
  staff: {
    badge: 'Xodimlar kabineti',
    Icon: Users,
    sub: 'Xodimlar boshqaruv paneliga kirish uchun ma’lumotlaringizni kiriting.',
    tag: 'Ta’lim markazi boshqaruv tizimi',
  },
  client: {
    badge: 'O’quvchi va ota-ona kabineti',
    Icon: UsersRound,
    sub: 'Farzandingiz o’qishi, davomati va to’lovlarini kuzatish uchun kabinetga kiring.',
    tag: 'O’quvchi va ota-ona kabineti',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [audience, setAudience] = useState<'staff' | 'client'>('staff');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.startsWith('my.')) {
      setAudience('client');
    }
  }, []);
  const c = COPY[audience];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Xatolik yuz berdi");
        setLoading(false);
        return;
      }

      // Cross-subdomain redirect (full URL) yoki oddiy path
      if (data.redirect.startsWith('http')) {
        window.location.href = data.redirect;
      } else {
        router.push(data.redirect);
      }
    } catch {
      setError("Server bilan aloqa yo'q");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px]" />
      </div>

      {/* Main card */}
      <div className="w-full max-w-4xl relative z-10 flex rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
        {/* Left side — Form */}
        <div className="w-full md:w-1/2 bg-white p-8 md:p-10 flex flex-col">
          {/* Logo */}
          <div className="mb-10">
            <Image src="/logo-horizontal.png" alt="Aka-Uka Ta'lim Markazi" width={180} height={56} className="object-contain" priority />
          </div>

          <div className="flex-1 flex flex-col justify-center w-full max-w-sm mx-auto md:mx-0">
            <span className="inline-flex items-center gap-1.5 self-start text-[11px] font-semibold text-[#2660A4] bg-[#2660A4]/10 px-2.5 py-1 rounded-full mb-3">
              <c.Icon className="w-3.5 h-3.5" /> {c.badge}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mb-1.5">Xush kelibsiz</h1>
            <p className="text-sm text-slate-400 mb-8">{c.sub}</p>

            {error && (
              <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Login <span className="text-red-500">*</span>
                </label>
                <input
                  id="login"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Loginingizni kiriting"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-[#2660A4] focus:ring-2 focus:ring-[#2660A4]/20 outline-none transition-all text-slate-900"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Parol <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Parolni kiriting"
                    className="w-full px-4 pr-12 py-3 rounded-lg border border-slate-200 focus:border-[#2660A4] focus:ring-2 focus:ring-[#2660A4]/20 outline-none transition-all text-slate-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko\'rsatish'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2660A4] text-white py-3.5 rounded-lg font-bold text-base hover:bg-[#1d4e87] transition-all shadow-lg shadow-[#2660A4]/25 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Kirilmoqda...
                  </span>
                ) : 'Kirish'}
              </button>
            </form>

            {/* Parolni unutish — self-service reset yo'q, admin bilan bog'lanish */}
            <p className="text-center text-xs text-slate-400 mt-6">
              Login yoki parolni unutdingizmi?{' '}
              <span className="text-slate-500 font-medium">Markaz administratori bilan bog&apos;laning.</span>
            </p>
          </div>

          {/* Xavfsizlik izohi */}
          <div className="mt-8 flex items-center justify-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Xavfsiz, shifrlangan ulanish</span>
          </div>
        </div>

        {/* Right side — Illustration */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-[#2660A4] via-[#1d4e87] to-[#22AA79] items-center justify-center p-10 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 right-10 w-20 h-20 border-2 border-white/30 rounded-full" />
            <div className="absolute bottom-20 left-10 w-32 h-32 border-2 border-white/20 rounded-full" />
            <div className="absolute top-1/3 left-1/4 w-3 h-3 bg-yellow-400 rounded-full" />
            <div className="absolute bottom-1/3 right-1/4 w-4 h-4 bg-pink-400 rounded-full" />
            <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-cyan-400 rounded-full" />
            <div className="absolute top-20 left-20 w-5 h-5 bg-green-400/60 rounded-full" />
            <div className="absolute bottom-1/4 left-1/3 w-6 h-6 border border-white/40 rounded-lg rotate-45" />
          </div>

          {/* Central content */}
          <div className="text-center relative z-10">
            <div className="mx-auto mb-6">
              <Image src="/logo-vertical-white.png" alt="Aka-Uka" width={160} height={160} className="object-contain mx-auto" />
            </div>
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-8 h-1 bg-white/40 rounded-full" />
              <div className="w-8 h-1 bg-white rounded-full" />
              <div className="w-8 h-1 bg-white/40 rounded-full" />
            </div>
            <p className="text-white/50 text-xs mt-6">{c.tag}</p>
          </div>
        </div>
      </div>

      {/* Zyron credit */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
        <Image src="/zyron-mark.svg" alt="Zyron" width={16} height={16} className="opacity-40" />
        <span className="text-white/30 text-[10px] font-medium">Zyron</span>
      </div>
    </div>
  );
}
