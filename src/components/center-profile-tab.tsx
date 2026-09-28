'use client';

// "Markaz profili" — superadmin bitta joyda markazni sozlaydi: brend (nom, rang,
// logo), o'z hisobi (login/parol) va filiallar. Brend DB Setting'da saqlanadi;
// bo'sh qiymat = instance'ning env standart brendi.

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Trash2, RotateCcw, Loader2, KeyRound, UserRound, Palette, Building2 } from 'lucide-react';
import { toast } from '@/components/toast';
import { BrandLogo } from '@/components/brand-logo';
import { BrandProvider, useBrand } from '@/components/brand-context';
import { BranchesTab } from '@/components/system-tabs';
import { resolveBrand, HEX_COLOR_RE } from '@/lib/brand';

const card = 'rounded-xl border border-slate-200 bg-white p-5';
const input = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30';
const label = 'text-xs font-medium text-slate-500';
const btn = 'flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:bg-[var(--brand-primary-dark)] disabled:opacity-60';
const btnGhost = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50';

const PRESETS = ['#2660A4', '#2563EB', '#0F766E', '#16A34A', '#7C3AED', '#DB2777', '#EA580C', '#DC2626'];

// Logo: proporsiyani saqlab ≤512px, shaffoflik uchun PNG.
async function compressLogo(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const MAX = 512;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

function SectionTitle({ icon: Icon, children, hint }: { icon: typeof Palette; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Icon className="w-4 h-4 text-[var(--brand-primary)]" /> {children}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

// ── Brend: nom, rang, logo + jonli ko'rinish ──
function BrandCard() {
  const router = useRouter();
  const current = useBrand();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ brandName: '', brandColor: '', brandLogo: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/superadmin/settings').then(r => r.json()).then(d => {
      setF({ brandName: d.brandName || '', brandColor: d.brandColor || '', brandLogo: d.brandLogo || '' });
      setLoading(false);
    });
  }, []);

  const preview = resolveBrand(f);
  const colorValid = f.brandColor === '' || HEX_COLOR_RE.test(f.brandColor);

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Faqat rasm fayl'); return; }
    try {
      const logo = await compressLogo(file);
      if (logo.length > 500_000) { toast.error('Logo juda katta — soddaroq rasm tanlang'); return; }
      setF(p => ({ ...p, brandLogo: logo }));
    } catch { toast.error('Rasmni o\'qib bo\'lmadi'); }
  };

  const save = async () => {
    if (!colorValid) { toast.error('Rang formati: #RRGGBB'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Saqlashda xatolik'); return; }
      toast.success('Brend saqlandi');
      router.refresh();
    } catch { toast.error('Tarmoq xatosi'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className={`${card} flex justify-center py-10`}><Loader2 className="w-5 h-5 animate-spin text-[var(--brand-primary)]" /></div>;

  return (
    <div className={card}>
      <SectionTitle icon={Palette} hint="Login sahifasi, menyu, brauzer ikonkasi va ota-ona botida ko'rinadi. Bo'sh qoldirilsa standart brend ishlatiladi.">
        Brend
      </SectionTitle>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 min-w-0">
          <div>
            <label className={label}>O&apos;quv markaz nomi</label>
            <input className={input} value={f.brandName} maxLength={80} placeholder={current.name}
              onChange={e => setF(p => ({ ...p, brandName: e.target.value }))} />
          </div>

          <div>
            <label className={label}>Asosiy rang</label>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {PRESETS.map(c => (
                <button key={c} type="button" aria-label={c} onClick={() => setF(p => ({ ...p, brandColor: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${f.brandColor.toLowerCase() === c.toLowerCase() ? 'border-slate-900 scale-110' : 'border-white shadow'}`}
                  style={{ background: c }} />
              ))}
              <input type="color" aria-label="Boshqa rang" value={HEX_COLOR_RE.test(f.brandColor) ? f.brandColor : preview.colors.primary}
                onChange={e => setF(p => ({ ...p, brandColor: e.target.value }))}
                className="w-9 h-8 rounded border border-slate-200 bg-white cursor-pointer" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input className={`${input} max-w-[140px] font-mono ${colorValid ? '' : 'border-red-400'}`} value={f.brandColor} placeholder="#2660A4"
                onChange={e => setF(p => ({ ...p, brandColor: e.target.value.trim() }))} />
              {f.brandColor && (
                <button type="button" onClick={() => setF(p => ({ ...p, brandColor: '' }))} className={btnGhost}>
                  <RotateCcw className="w-3.5 h-3.5" /> Standart
                </button>
              )}
            </div>
          </div>

          <div>
            <label className={label}>Logo</label>
            <p className="text-xs text-slate-400 mb-2">PNG/JPG, shaffof fonli PNG tavsiya etiladi. Yuklanmasa nom harflaridan belgi yasaladi.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className={btnGhost}>
                <ImagePlus className="w-3.5 h-3.5" /> {f.brandLogo ? 'Almashtirish' : 'Yuklash'}
              </button>
              {f.brandLogo && (
                <button type="button" onClick={() => setF(p => ({ ...p, brandLogo: '' }))} className={`${btnGhost} text-red-600 border-red-200 hover:bg-red-50`}>
                  <Trash2 className="w-3.5 h-3.5" /> O&apos;chirish
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={e => { pickLogo(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
          </div>

          <button onClick={save} disabled={saving || !colorValid} className={btn}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Saqlash
          </button>
        </div>

        {/* Jonli ko'rinish — saqlashdan oldin natija */}
        <div className="min-w-0">
          <p className={`${label} mb-2`}>Ko&apos;rinishi</p>
          <BrandProvider value={preview}>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 h-14" style={{ background: preview.colors.primary }}>
                <BrandLogo slot="topbarWhite" className="object-contain" />
              </div>
              <div className="flex">
                <div className="w-16 border-r border-slate-100 flex justify-center py-4 bg-white">
                  <BrandLogo slot="sidebarMark" className="object-contain" />
                </div>
                <div className="flex-1 p-4 space-y-3 bg-slate-50 min-w-0">
                  <div className="overflow-hidden"><BrandLogo slot="loginHorizontal" className="object-contain max-w-full" /></div>
                  <div className="h-9 rounded-lg text-white text-sm font-bold flex items-center justify-center" style={{ background: preview.colors.primary }}>
                    Kirish
                  </div>
                  <div className="flex gap-1.5">
                    {[preview.colors.primaryDark, preview.colors.primary, preview.colors.primaryLight, preview.colors.accent].map(c => (
                      <span key={c} className="h-2 flex-1 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </BrandProvider>
        </div>
      </div>
    </div>
  );
}

// ── Superadmin hisobi: login va parol ──
function AccountCard() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [lf, setLf] = useState({ newLogin: '', currentPassword: '' });
  const [pf, setPf] = useState({ currentPassword: '', newPassword: '', repeat: '' });
  const [busy, setBusy] = useState<'' | 'login' | 'pass'>('');

  useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setLogin(d.user?.login || '')); }, []);

  const saveLogin = async () => {
    setBusy('login');
    try {
      const res = await fetch('/api/superadmin/account', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lf),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Xatolik'); return; }
      setLogin(d.login);
      setLf({ newLogin: '', currentPassword: '' });
      toast.success('Login o\'zgartirildi');
      router.refresh();
    } catch { toast.error('Tarmoq xatosi'); }
    finally { setBusy(''); }
  };

  const savePass = async () => {
    if (pf.newPassword.length < 6) { toast.error('Yangi parol kamida 6 belgi'); return; }
    if (pf.newPassword !== pf.repeat) { toast.error('Yangi parollar mos emas'); return; }
    setBusy('pass');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pf.currentPassword, newPassword: pf.newPassword }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Xatolik'); return; }
      setPf({ currentPassword: '', newPassword: '', repeat: '' });
      toast.success('Parol o\'zgartirildi');
    } catch { toast.error('Tarmoq xatosi'); }
    finally { setBusy(''); }
  };

  return (
    <div className={card}>
      <SectionTitle icon={UserRound} hint="O'zgartirilganda boshqa qurilmalardagi sessiyalar yopiladi.">
        Superadmin hisobi {login && <span className="ml-1 font-mono text-xs font-medium text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{login}</span>}
      </SectionTitle>
      <div className="grid gap-6 md:grid-cols-2">
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); saveLogin(); }}>
          <p className="text-xs font-semibold text-slate-600">Loginni o&apos;zgartirish</p>
          <div>
            <label className={label}>Yangi login</label>
            <input className={input} autoComplete="username" value={lf.newLogin} maxLength={40}
              onChange={e => setLf(p => ({ ...p, newLogin: e.target.value.trim() }))} />
          </div>
          <div>
            <label className={label}>Joriy parol</label>
            <input type="password" className={input} autoComplete="current-password" value={lf.currentPassword}
              onChange={e => setLf(p => ({ ...p, currentPassword: e.target.value }))} />
          </div>
          <button type="submit" disabled={busy !== '' || !lf.newLogin || !lf.currentPassword} className={btn}>
            {busy === 'login' && <Loader2 className="w-4 h-4 animate-spin" />} Loginni saqlash
          </button>
        </form>

        <form className="space-y-3" onSubmit={e => { e.preventDefault(); savePass(); }}>
          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Parolni o&apos;zgartirish</p>
          <div>
            <label className={label}>Joriy parol</label>
            <input type="password" className={input} autoComplete="current-password" value={pf.currentPassword}
              onChange={e => setPf(p => ({ ...p, currentPassword: e.target.value }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Yangi parol</label>
              <input type="password" className={input} autoComplete="new-password" value={pf.newPassword}
                onChange={e => setPf(p => ({ ...p, newPassword: e.target.value }))} />
            </div>
            <div>
              <label className={label}>Takroran</label>
              <input type="password" className={input} autoComplete="new-password" value={pf.repeat}
                onChange={e => setPf(p => ({ ...p, repeat: e.target.value }))} />
            </div>
          </div>
          <button type="submit" disabled={busy !== '' || !pf.currentPassword || !pf.newPassword} className={btn}>
            {busy === 'pass' && <Loader2 className="w-4 h-4 animate-spin" />} Parolni saqlash
          </button>
        </form>
      </div>
    </div>
  );
}

export function CenterProfileTab() {
  return (
    <div className="space-y-4">
      <BrandCard />
      <AccountCard />
      <div>
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3 px-1">
          <Building2 className="w-4 h-4 text-[var(--brand-primary)]" /> Filiallar
        </p>
        <BranchesTab />
      </div>
    </div>
  );
}
