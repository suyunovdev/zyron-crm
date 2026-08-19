'use client';

import { useRef, useState } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/components/toast';

// Client tomonda rasmni 256px kvadratga siqib (cover), JPEG data URL qilib yuboradi.
async function compress(file: File): Promise<string> {
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
  const SIZE = 256;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE; canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  // cover: eng kichik o'lchamга moslab markazdan kesamiz
  const scale = Math.max(SIZE / img.width, SIZE / img.height);
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function AvatarUpload({
  avatar,
  name,
  onChange,
  size = 80,
}: {
  avatar: string | null;
  name: string;
  onChange: (a: string | null) => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const save = async (value: string | null) => {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/avatar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: value }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || 'Xatolik'); return; }
      onChange(value);
      // Topbar avatarini darhol yangilash uchun (DashboardLayout tinglaydi)
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: value }));
      toast.success(value ? 'Profil rasmi yangilandi' : 'Rasm o\'chirildi');
    } finally { setBusy(false); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Faqat rasm fayli'); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error('Rasm 8MB dan katta bo\'lmasin'); return; }
    setBusy(true);
    try {
      const compressed = await compress(file);
      await save(compressed);
    } catch { toast.error('Rasmni o\'qib bo\'lmadi'); setBusy(false); }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="w-full h-full rounded-2xl object-cover border border-slate-200" />
        ) : (
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[#22AA79] flex items-center justify-center">
            <span className="text-white font-bold" style={{ fontSize: size / 2.8 }}>{initials}</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        <button onClick={() => inputRef.current?.click()} disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1f4f88] disabled:opacity-50">
          <Camera className="w-4 h-4" /> {avatar ? 'Rasmni almashtirish' : 'Rasm yuklash'}
        </button>
        {avatar && (
          <button onClick={() => save(null)} disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <Trash2 className="w-4 h-4" /> O&apos;chirish
          </button>
        )}
        <p className="text-[11px] text-slate-400">JPG/PNG · avtomatik siqiladi</p>
      </div>
    </div>
  );
}
