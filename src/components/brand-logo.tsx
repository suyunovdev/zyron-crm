import Image from 'next/image';
import { LOGO, BRAND_SHORT, BRAND_COLORS, BRAND_INITIAL } from '@/lib/brand';

// Brendga mos logo:
//  - kind 'image' (standart/Zyron): SVG uchun <img>, PNG uchun next/image.
//  - kind 'wordmark' (generic): logo o'rniga NEXT_PUBLIC_BRAND_NAME dan matn.
//  - kind 'mark' (generic): kvadrat initsial belgi (gradient + harf).
// Generic rejimda rang nomdan avtomatik hosil bo'ladi (brand.ts) — har mijoz
// alohida logo tayyorlamay ham o'ziga xos ko'rinadi.
export function BrandLogo({
  slot,
  className,
  priority,
}: {
  slot: keyof typeof LOGO;
  className?: string;
  priority?: boolean;
}) {
  const l = LOGO[slot];

  // Generic: matnli wordmark (birinchi harf urg'u rangida)
  if (l.kind === 'wordmark') {
    const [first, ...rest] = BRAND_SHORT;
    const base = l.onDark ? '#ffffff' : BRAND_COLORS.ink;
    const lead = l.onDark ? '#ffffff' : BRAND_COLORS.accent;
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
          background: `linear-gradient(135deg, ${BRAND_COLORS.accent} 0%, ${BRAND_COLORS.primary} 100%)`,
          color: '#ffffff',
          fontSize: Math.round(l.h * 0.5),
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {BRAND_INITIAL}
      </span>
    );
  }

  // Standart/Zyron: rasm (SVG uchun oddiy <img>, PNG uchun next/image)
  if (l.svg) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={l.src} width={l.w} height={l.h} alt={BRAND_SHORT} className={className} />;
  }
  return <Image src={l.src} width={l.w} height={l.h} alt={BRAND_SHORT} className={className} priority={priority} />;
}
