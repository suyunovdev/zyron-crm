/**
 * Oddiy in-memory rate limiter (sliding window).
 *
 * ESLATMA: bu xotirada ishlaydi — bitta jarayon uchun. Bir nechta instance
 * (PM2 cluster / bir nechta server) bo'lsa, Redis kabi umumiy do'kon kerak.
 * Kichik/o'rta yuklamada login'ni brute-force'dan himoya qilishga yetarli.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * @param key      cheklov kaliti (masalan `login:<ip>`)
 * @param limit    oynada ruxsat etilgan urinishlar soni
 * @param windowMs oyna davomiyligi (ms)
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count, retryAfterSec: 0 };
}

/** So'rovdan mijoz IP manzilini ajratib olish (proxy header'larini hisobga oladi). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

// Vaqti o'tgan bucketlarni tozalash (xotira o'smasligi uchun)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) if (now >= b.resetAt) buckets.delete(key);
  }, 5 * 60 * 1000).unref?.();
}
