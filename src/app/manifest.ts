import type { MetadataRoute } from 'next';
import { getBrand } from '@/lib/brand-server';

// PWA manifest — mijoz portali (my.) telefonda "Bosh ekranga qo'shish" bilan
// o'rnatiladigan bo'ladi. Brendga qarab nom/rang/ikonka o'zgaradi.
// Brend DB'dan (superadmin "Markaz profili") — har so'rovda.
export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { name, short, colors, manifestIcon } = await getBrand();
  return {
    name: `${name} — Boshqaruv tizimi`,
    short_name: short,
    description: `${name} boshqaruv tizimi: o'quvchilar, guruhlar, davomat va to'lovlar.`,
    lang: 'uz',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: colors.primary,
    categories: ['education', 'business', 'productivity'],
    icons: [
      // Brend belgisi (Zyron SVG / Aka-Uka PNG) — har o'lchamga moslashadi.
      { src: manifestIcon.src, sizes: 'any', type: manifestIcon.type, purpose: 'any' },
      { src: '/favicon.ico', sizes: '256x256', type: 'image/x-icon' },
    ],
  };
}
