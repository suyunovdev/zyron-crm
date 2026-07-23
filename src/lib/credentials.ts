import { prisma } from '@/lib/db';

// Kirill → lotin (Uzbek ismlar kirillda kelsa)
const CYR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'x', ц: 's', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

/** Ism → login uchun asos (birinchi so'z, lotin, faqat a-z0-9). */
export function loginBase(name: string): string {
  const first = (name || '').trim().split(/\s+/)[0] || '';
  const b = first.toLowerCase()
    .split('').map(ch => CYR[ch] ?? ch).join('')
    .replace(/[ʻʼ'`‘’]/g, '')
    .replace(/[^a-z0-9]/g, '');
  return b || 'oquvchi';
}

/** Ambiguous belgilarsiz (o,0,l,1,i) tasodifiy parol. */
export function randomPassword(len = 6): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let p = '';
  for (let i = 0; i < len; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

/** DB'da mavjud emasligini tekshirib, unique login qaytaradi (base + 3 xonali son). */
export async function uniqueLogin(base: string): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const candidate = `${base}${Math.floor(100 + Math.random() * 900)}`;
    const exists = await prisma.user.findUnique({ where: { login: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `${base}${Date.now().toString().slice(-6)}`;
}

/** Login stringidan unique variant (band bo'lsa qo'shimcha son). */
export async function ensureUnique(login: string): Promise<string> {
  const exists = await prisma.user.findUnique({ where: { login }, select: { id: true } });
  if (!exists) return login;
  return uniqueLogin(login);
}

/** O'quvchi ismidan ota-ona nomi. "Adolat Nazarov" → "Nazarov oilasi". */
export function parentNameFrom(studentName: string): string {
  const parts = (studentName || '').trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[parts.length - 1]} oilasi`;
  return `${studentName} ota-onasi`;
}
