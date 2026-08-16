import type { MetadataRoute } from 'next';
import { BRAND_NAME, BRAND_SHORT, BRAND_COLORS, BRAND_MANIFEST_ICON } from '@/lib/brand';

// PWA manifest — mijoz portali (my.) telefonda "Bosh ekranga qo'shish" bilan
// o'rnatiladigan bo'ladi. Brendga qarab nom/rang/ikonka o'zgaradi.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_NAME} — Boshqaruv tizimi`,
    short_name: BRAND_SHORT,
    description: `${BRAND_NAME} boshqaruv tizimi: o'quvchilar, guruhlar, davomat va to'lovlar.`,
    lang: 'uz',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: BRAND_COLORS.primary,
    categories: ['education', 'business', 'productivity'],
    icons: [
      // Brend belgisi (Zyron SVG / Aka-Uka PNG) — har o'lchamga moslashadi.
      { src: BRAND_MANIFEST_ICON.src, sizes: 'any', type: BRAND_MANIFEST_ICON.type, purpose: 'any' },
      { src: '/favicon.ico', sizes: '256x256', type: 'image/x-icon' },
    ],
  };
}
