import { SignJWT, jwtVerify } from 'jose';

// Telegram deep-link tokeni — ota-onani botga bog'lash uchun.
// Stateless JWT (auth.ts qolipi): qisqa muddatli, purpose='tg-link', parentId ichida.
// Bog'lash idempotent — token faqat parentId beradi, chatId Telegram update'idan olinadi.

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const PURPOSE = 'tg-link';
const TTL = '15m'; // deep-link 15 daqiqa amal qiladi

/** Ota-ona uchun bir martalik deep-link tokeni (15 min). */
export async function createTgLinkToken(parentId: string): Promise<string> {
  return new SignJWT({ purpose: PURPOSE, parentId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TTL)
    .sign(SECRET);
}

/** Tokenni tekshiradi — to'g'ri bo'lsa parentId, aks holda null. */
export async function verifyTgLinkToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.purpose !== PURPOSE || typeof payload.parentId !== 'string') return null;
    return payload.parentId;
  } catch {
    return null;
  }
}
