// Lid manbasi (attribution) — yagona kanonik lug'at.
// Bot, admin qo'lda qo'shish va analitika — hammasi shu qiymatlardan foydalanadi.

export interface SourceOption {
  slug: string;
  label: string;
  emoji: string;
  color: string; // chart uchun
}

export const SOURCE_OPTIONS: SourceOption[] = [
  { slug: 'instagram', label: 'Instagram', emoji: '📷', color: '#E1306C' },
  { slug: 'telegram', label: 'Telegram', emoji: '✈️', color: '#229ED9' },
  { slug: 'youtube', label: 'YouTube', emoji: '▶️', color: '#FF0000' },
  { slug: 'street', label: "Ko'chada (banner/reklama)", emoji: '🚶', color: '#F59E0B' },
  { slug: 'friends', label: "Do'st/tanish tavsiyasi", emoji: '👥', color: '#10B981' },
  { slug: 'website', label: 'Veb-sayt', emoji: '🌐', color: '#6366F1' },
  { slug: 'other', label: 'Boshqa', emoji: '🔎', color: '#94A3B8' },
];

/** Bot funnel'да ko'rsatiladigan variantlar (veb-sayt kiritilmaydi — ular Telegram'да). */
export const BOT_SOURCE_OPTIONS = SOURCE_OPTIONS.filter(o => o.slug !== 'website');

export const SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  SOURCE_OPTIONS.map(o => [o.slug, o.label]),
);
export const SOURCE_COLORS: Record<string, string> = Object.fromEntries(
  SOURCE_OPTIONS.map(o => [o.slug, o.color]),
);
export const SOURCE_EMOJI: Record<string, string> = Object.fromEntries(
  SOURCE_OPTIONS.map(o => [o.slug, o.emoji]),
);

// Eski/xilma-xil qiymatlarni kanonik slug'ga keltirish (case-insensitive).
const ALIASES: Record<string, string> = {
  'do\'stlar': 'friends', 'dostlar': 'friends', 'do‘stlar': 'friends',
  'friend': 'friends', 'tanish': 'friends',
  'boshqa': 'other', 'website': 'website', 'sayt': 'website', 'web': 'website',
  'instagram': 'instagram', 'insta': 'instagram', 'ig': 'instagram',
  'telegram': 'telegram', 'tg': 'telegram',
  'youtube': 'youtube', 'yt': 'youtube',
  'street': 'street', 'ko\'cha': 'street', 'kocha': 'street', 'banner': 'street', 'reklama': 'street',
};

/** Har qanday xom qiymatni kanonik slug'ga aylantiradi. Noma'lum/bo'sh → 'other'. */
export function normalizeSource(raw?: string | null): string {
  if (!raw) return 'other';
  const k = raw.trim().toLowerCase();
  if (SOURCE_LABELS[k]) return k;      // allaqachon kanonik slug
  if (ALIASES[k]) return ALIASES[k];
  return 'other';
}

export function sourceLabel(raw?: string | null): string {
  return SOURCE_LABELS[normalizeSource(raw)] || 'Boshqa';
}
