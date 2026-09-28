'use client';

import Image from 'next/image';
import type { LogoSlot } from '@/lib/brand';
import { useBrand } from '@/components/brand-context';

// Brendga mos logo:
//  - kind 'image' (standart/Zyron): SVG uchun <img>, PNG uchun next/image.
//  - kind 'wordmark' (generic): logo o'rniga NEXT_PUBLIC_BRAND_NAME dan matn.
//  - kind 'mark' (generic): kvadrat initsial belgi (gradient + harf).
// Generic rejimda rang nomdan avtomatik hosil bo'ladi (brand.ts) — har mijoz
// alohida logo tayyorlamay ham o'ziga xos ko'rinadi.
// Qiymatlar useBrand()'dan — superadmin "Markaz profili"da o'zgartirsa darrov yangilanadi.
export function BrandLogo({
  slot,
  className,
  priority,
}: {
  slot: 'loginHorizontal' | 'loginHero' | 'sidebarMark' | 'topbarWhite';
  className?: string;
  priority?: boolean;
}) {
  const { logo, short, colors, initial, customLogo } = useBrand();
  const l: LogoSlot = logo[slot];

  // Yuklangan logo: balandlik bo'yicha (kenglik proporsional, slot kengligidan oshmaydi);
  // qorong'i fonda oq "chip" ichida (rangli logo ko'rinsin)
  if (customLogo) {
    // eslint-disable-next-line @next/next/no-img-element
    const img = <img src={l.src} alt={short} className={className} style={{ height: l.h, width: 'auto', maxWidth: l.w, objectFit: 'contain' }} />;
    return l.onDark
      ? <span style={{ display: 'inline-flex', background: '#ffffff', borderRadius: 10, padding: 4 }}>{img}</span>
      : img;
  }

  // Generic: matnli wordmark (birinchi harf urg'u rangida)
  if (l.kind === 'wordmark') {
    const [first, ...rest] = short;
    const base = l.onDark ? '#ffffff' : colors.ink;
    const lead = l.onDark ? '#ffffff' : colors.accent;
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: l.h,
          fontSize: Math.round(l.h * 0.6),
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          color: base,
        }}
      >
        <span style={{ color: lead }}>{first}</span>
        {rest.join('')}
      </span>
    );
  }

  // Generic: kvadrat initsial belgi
  if (l.kind === 'mark') {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: l.w,
          height: l.h,
          borderRadius: Math.round(Math.min(l.w, l.h) * 0.22),
          background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)`,
          color: '#ffffff',
          fontSize: Math.round(l.h * 0.5),
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {initial}
      </span>
    );
  }

  // Standart/Zyron: rasm (SVG uchun oddiy <img>, PNG uchun next/image)
  if (l.svg) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={l.src} width={l.w} height={l.h} alt={short} className={className} />;
  }
  return <Image src={l.src} width={l.w} height={l.h} alt={short} className={className} priority={priority} />;
}
