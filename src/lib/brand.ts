// Sozlanadigan brend (white-label). Standart = Aka-Uka (real mijoz o'zgarmaydi).
// Demo/boshqa mijozlar env orqali o'zgartiradi:
//   NEXT_PUBLIC_BRAND=zyron  +  NEXT_PUBLIC_BRAND_NAME=Zyron
// NEXT_PUBLIC_* build-time inline bo'ladi (har nusxa o'z brendini oladi).

const IS_ZYRON = (process.env.NEXT_PUBLIC_BRAND || '').toLowerCase() === 'zyron';

export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Aka-Uka Ta'lim Markazi";
export const BRAND_SHORT = process.env.NEXT_PUBLIC_BRAND_NAME || 'Aka-Uka';

interface LogoSlot { src: string; w: number; h: number; svg: boolean }

// Kontekstga qarab logo (til/fon): oq fon vs qorong'i fon, kvadrat belgi vs wordmark.
export const LOGO: Record<'loginHorizontal' | 'loginHero' | 'sidebarMark' | 'topbarWhite', LogoSlot> = IS_ZYRON
  ? {
      loginHorizontal: { src: '/zyron-logo-light.svg', w: 150, h: 43, svg: true },
      loginHero:       { src: '/zyron-mark.svg', w: 120, h: 130, svg: true },
      sidebarMark:     { src: '/zyron-mark.svg', w: 44, h: 48, svg: true },
      topbarWhite:     { src: '/zyron-logo-white.svg', w: 132, h: 38, svg: true },
    }
  : {
      loginHorizontal: { src: '/logo-horizontal.png', w: 180, h: 56, svg: false },
      loginHero:       { src: '/logo-vertical-white.png', w: 160, h: 160, svg: false },
      sidebarMark:     { src: '/logo-vertical.png', w: 50, h: 50, svg: false },
      topbarWhite:     { src: '/logo-horizontal-white.png', w: 120, h: 36, svg: false },
    };
