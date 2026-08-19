// Sozlanadigan brend (white-label). Standart = Aka-Uka (real mijoz o'zgarmaydi).
// Env orqali brend tanlanadi (NEXT_PUBLIC_* build-time inline — har nusxa o'ziniki):
//   NEXT_PUBLIC_BRAND=zyron    -> Zyron logolari
//   NEXT_PUBLIC_BRAND=generic  -> logo YO'Q; NEXT_PUBLIC_BRAND_NAME dan wordmark +
//                                 initsial belgi, rang nomdan avtomatik hosil bo'ladi.
//   (bo'sh)                    -> standart Aka-Uka logolari
// Har doim: NEXT_PUBLIC_BRAND_NAME mijoz nomini beradi.

const BRAND = (process.env.NEXT_PUBLIC_BRAND || '').toLowerCase();
export const IS_ZYRON = BRAND === 'zyron';
export const IS_GENERIC = BRAND === 'generic';

export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Aka-Uka Ta'lim Markazi";
export const BRAND_SHORT = process.env.NEXT_PUBLIC_BRAND_NAME || 'Aka-Uka';

// Ilova manzili (canonical/OG/metadataBase uchun). Har nusxa o'z env'idan,
// aks holda brendga qarab standart. NEXT_PUBLIC_* build-time inline bo'ladi.
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (IS_ZYRON ? 'https://zyron-crm.zyron.uz' : 'https://crm.akaukalarmarkazi.uz');

// --- Generic brend uchun rang: nomdan deterministik hosil bo'ladi ---
// Har mijoz o'ziga xos rang oladi (alohida logo/asset shart emas). Xohlasa
// NEXT_PUBLIC_BRAND_HUE (0-360) bilan qo'lda belgilash mumkin.
function hueFromString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) >>> 0;
  return h % 360;
}
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
const GENERIC_HUE = process.env.NEXT_PUBLIC_BRAND_HUE
  ? Number(process.env.NEXT_PUBLIC_BRAND_HUE) % 360
  : hueFromString(BRAND_NAME);
const GENERIC_COLORS = {
  primary: hslToHex(GENERIC_HUE, 65, 45),
  primaryDark: hslToHex(GENERIC_HUE, 68, 33),
  primaryLight: hslToHex(GENERIC_HUE, 70, 60),
  accent: hslToHex((GENERIC_HUE + 18) % 360, 72, 55),
  ink: '#0F172A',
};

// Brend ranglari — ikonka (ImageResponse), manifest theme_color, viewport va butun
// UI temasi (globals.css --brand-* CSS o'zgaruvchilari orqali) uchun.
// primaryDark/primaryLight — hover/gradient/dark holatlar uchun.
// Zyron: ko'k; Aka-Uka: klassik ko'k; Generic: nomdan hosil (hex — satori mos).
export const BRAND_COLORS = IS_ZYRON
  ? { primary: '#2563EB', primaryDark: '#1D4ED8', primaryLight: '#60A5FA', accent: '#06B6D4', ink: '#0F172A' }
  : IS_GENERIC
    ? GENERIC_COLORS
    : { primary: '#2660A4', primaryDark: '#1D4E87', primaryLight: '#3A7BC8', accent: '#1D4E87', ink: '#0F172A' };

// Ikonka belgisidagi harf (kvadrat tile markazida).
const FIRST_ALNUM = (BRAND_NAME.match(/[A-Za-z0-9]/)?.[0] || 'A').toUpperCase();
export const BRAND_INITIAL = IS_ZYRON ? 'Z' : IS_GENERIC ? FIRST_ALNUM : 'A';

// Manifest ikonasi. Generic: statik fayl yo'q — dinamik /icon route (PNG) ishlatiladi.
export const BRAND_MANIFEST_ICON = IS_ZYRON
  ? { src: '/zyron-mark.svg', type: 'image/svg+xml' }
  : IS_GENERIC
    ? { src: '/icon', type: 'image/png' }
    : { src: '/logo-vertical.png', type: 'image/png' };

// LogoSlot: kind 'image' (rasm), 'wordmark' (matn), 'mark' (kvadrat initsial belgi).
// onDark — qorong'i fonda (oq matn kerak bo'lganda).
interface LogoSlot {
  src: string;
  w: number;
  h: number;
  svg?: boolean;
  kind?: 'image' | 'wordmark' | 'mark';
  onDark?: boolean;
}

// Kontekstga qarab logo (til/fon): oq fon vs qorong'i fon, kvadrat belgi vs wordmark.
export const LOGO: Record<'loginHorizontal' | 'loginHero' | 'sidebarMark' | 'topbarWhite', LogoSlot> = IS_ZYRON
  ? {
      loginHorizontal: { src: '/zyron-logo-light.svg', w: 150, h: 43, svg: true },
      loginHero:       { src: '/zyron-mark.svg', w: 120, h: 130, svg: true },
      sidebarMark:     { src: '/zyron-mark.svg', w: 44, h: 48, svg: true },
      topbarWhite:     { src: '/zyron-logo-white.svg', w: 132, h: 38, svg: true },
    }
  : IS_GENERIC
    ? {
        loginHorizontal: { src: '', w: 200, h: 40, kind: 'wordmark', onDark: false },
        loginHero:       { src: '', w: 120, h: 120, kind: 'mark' },
        sidebarMark:     { src: '', w: 44, h: 44, kind: 'mark' },
        topbarWhite:     { src: '', w: 160, h: 36, kind: 'wordmark', onDark: true },
      }
    : {
        loginHorizontal: { src: '/logo-horizontal.png', w: 180, h: 56, svg: false },
        loginHero:       { src: '/logo-vertical-white.png', w: 160, h: 160, svg: false },
        sidebarMark:     { src: '/logo-vertical.png', w: 50, h: 50, svg: false },
        topbarWhite:     { src: '/logo-horizontal-white.png', w: 120, h: 36, svg: false },
      };
