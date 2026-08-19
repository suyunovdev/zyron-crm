import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';

// Telegram deep-link tokeni — ota-onani botga bog'lash uchun.
// DB-backed bir martalik token: Telegram `start` parametri cheklovlariga mos bo'lishi shart
// (faqat [A-Za-z0-9_-], maks 64 belgi) — shu sabab JWT emas, qisqa random token.

const TTL_MS = 15 * 60 * 1000; // 15 daqiqa

/** Ota-ona uchun bir martalik deep-link tokeni yaratadi (User'da saqlanadi). */
export async function createTgLinkToken(parentId: string): Promise<string> {
  const token = randomBytes(24).toString('base64url'); // 32 belgi, [A-Za-z0-9_-], nuqtasiz
  await prisma.user.update({
    where: { id: parentId },
    data: { tgLinkToken: token, tgLinkTokenExp: new Date(Date.now() + TTL_MS) },
  });
  return token;
}

/** Tokenni tekshiradi — amal qiluvchi bo'lsa parentId, aks holda null. */
export async function verifyTgLinkToken(token: string): Promise<string | null> {
  if (!token) return null;
  const u = await prisma.user.findUnique({
    where: { tgLinkToken: token },
    select: { id: true, role: true, tgLinkTokenExp: true },
  });
  if (!u || u.role !== 'parent') return null;
  if (!u.tgLinkTokenExp || u.tgLinkTokenExp.getTime() < Date.now()) return null;
  return u.id;
}

/** Bog'langach tokenni bekor qiladi (bir martalik). */
export async function clearTgLinkToken(parentId: string): Promise<void> {
  await prisma.user
    .update({ where: { id: parentId }, data: { tgLinkToken: null, tgLinkTokenExp: null } })
    .catch(() => {});
}
