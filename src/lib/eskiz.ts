import { logger } from '@/lib/logger';

// Eskiz.uz SMS gateway integratsiyasi.
// Sozlash (env): ESKIZ_EMAIL, ESKIZ_PASSWORD, ESKIZ_FROM (ixtiyoriy, default "4546").
// Token 30 kun amal qiladi; jarayon ichida keshlanadi, 401 da avto qayta login.

const BASE = 'https://notify.eskiz.uz/api';

let cachedToken: string | null = null;

export function eskizConfigured(): boolean {
  return Boolean(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD);
}

/**
 * O'zbek telefon raqamini Eskiz formatiga (998XXXXXXXXX) keltiradi.
 * "+998 94 329-28-31", "998943292831", "943292831" — hammasi qabul qilinadi.
 * Noto'g'ri bo'lsa null qaytaradi.
 */
export function normalizePhone(raw: string): string | null {
  const d = (raw || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('998')) return d;
  if (d.length === 9) return '998' + d;               // operator kodi + raqam
  if (d.length === 13 && d.startsWith('0998')) return d.slice(1);
  return null;
}

async function login(): Promise<string | null> {
  const email = process.env.ESKIZ_EMAIL;
  const password = process.env.ESKIZ_PASSWORD;
  if (!email || !password) return null;
  try {
    const body = new FormData();
    body.append('email', email);
    body.append('password', password);
    const res = await fetch(`${BASE}/auth/login`, { method: 'POST', body });
    const json = await res.json().catch(() => ({}));
    const token = json?.data?.token;
    if (!res.ok || !token) {
      logger.error('[eskiz] login xato', { status: res.status, message: json?.message });
      return null;
    }
    cachedToken = token;
    return token;
  } catch (e) {
    logger.error('[eskiz] login exception', { error: (e as Error).message });
    return null;
  }
}

async function getToken(): Promise<string | null> {
  return cachedToken || login();
}

interface SendOutcome { ok: boolean; status?: number; error?: string }

async function sendOne(token: string, phone: string, message: string): Promise<SendOutcome> {
  const from = process.env.ESKIZ_FROM || '4546';
  try {
    const body = new FormData();
    body.append('mobile_phone', phone);
    body.append('message', message);
    body.append('from', from);
    const res = await fetch(`${BASE}/message/sms/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    if (res.status === 401) return { ok: false, status: 401 };
    const json = await res.json().catch(() => ({}));
    // Eskiz muvaffaqiyatda { id, status: "waiting"|"..." } qaytaradi
    if (!res.ok || json?.status === 'error') {
      return { ok: false, status: res.status, error: json?.message || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface SmsResult { phone: string; ok: boolean; error?: string }

/** Bitta raqamga SMS yuborish (401 da avtomatik qayta login). */
export async function sendSms(rawPhone: string, message: string): Promise<SmsResult> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { phone: rawPhone, ok: false, error: "noto'g'ri raqam" };

  let token = await getToken();
  if (!token) return { phone, ok: false, error: 'gateway sozlanmagan' };

  let r = await sendOne(token, phone, message);
  if (r.status === 401) {
    cachedToken = null;               // token eskirgan — yangilaymiz
    token = await login();
    if (!token) return { phone, ok: false, error: 'auth xato' };
    r = await sendOne(token, phone, message);
  }
  return { phone, ok: r.ok, error: r.error };
}

/** Ko'p raqamga ketma-ket yuborish (gateway'ni bosmaslik uchun). */
export async function sendBulk(
  phones: string[],
  message: string,
): Promise<{ sent: number; failed: number; results: SmsResult[] }> {
  const results: SmsResult[] = [];
  for (const p of phones) {
    results.push(await sendSms(p, message));
  }
  const sent = results.filter(r => r.ok).length;
  return { sent, failed: results.length - sent, results };
}
