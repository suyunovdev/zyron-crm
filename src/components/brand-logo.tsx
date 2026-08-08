import Image from 'next/image';
import { LOGO, BRAND_SHORT } from '@/lib/brand';

// Brendga mos logo. SVG (Zyron) uchun oddiy <img> (next/image SVG'ni cheklaydi);
// PNG (standart) uchun optimallashtirilgan next/image.
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
  if (l.svg) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={l.src} width={l.w} height={l.h} alt={BRAND_SHORT} className={className} />;
  }
  return <Image src={l.src} width={l.w} height={l.h} alt={BRAND_SHORT} className={className} priority={priority} />;
}
