import { describe, it, expect } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('limitgacha ruxsat beradi, keyin bloklaydi', () => {
    const key = `test:${Math.random()}`;
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true); // 1
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true); // 2
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true); // 3
    const blocked = rateLimit(key, 3, 60_000);            // 4 — blok
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('remaining to\'g\'ri kamayadi', () => {
    const key = `test:${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).remaining).toBe(1);
    expect(rateLimit(key, 2, 60_000).remaining).toBe(0);
  });

  it('oyna tugagach qayta tiklanadi', () => {
    const key = `test:${Math.random()}`;
    expect(rateLimit(key, 1, 1).allowed).toBe(true);
    // 1ms oyna — keyingi tick'da reset bo'ladi
    const later = Date.now() + 5;
    while (Date.now() < later) { /* qisqa kutish */ }
    expect(rateLimit(key, 1, 1).allowed).toBe(true);
  });

  it('turli kalitlar mustaqil', () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true); // b alohida
  });
});
