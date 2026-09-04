import { describe, it, expect } from 'vitest';
import { billableCost, computeBillableRecords, groupCost, perLessonRate } from '@/lib/billing-core';

const P = true, A = false;
// Yordamchi: present/absent + rate ketma-ketligidan records yasash
const seq = (rate: number, ...presents: boolean[]) =>
  presents.map((present, i) => ({
    scheduledDate: `2026-07-${String(i + 1).padStart(2, '0')}`,
    present,
    rate,
  }));

describe('computeBillableRecords — generic (rate saqlanadi)', () => {
  it('billable yozuvlar rate maydonini saqlaydi', () => {
    const { billable } = computeBillableRecords(seq(1000, P, A, A, A, A));
    // present + 3 grace = 4 billable (4-yo\'qlik emas)
    expect(billable.length).toBe(4);
    expect(billable.every(r => r.rate === 1000)).toBe(true);
  });
});

describe('billableCost — narx snapshot (K-2)', () => {
  const rate = perLessonRate(400000, 12); // 33333.33...

  it('doimiy rate holatida groupCost bilan bir xil (retro-moslik)', () => {
    // 7 present → 7 billable
    const recs = seq(rate, P, P, P, P, P, P, P);
    expect(billableCost(recs)).toBe(groupCost(7, 400000, 12)); // 233333
  });

  it('to\'liq oy (12 dars) = to\'liq narx', () => {
    const recs = seq(rate, ...Array(12).fill(P));
    expect(billableCost(recs)).toBe(400000);
  });

  it('grace: 4 ketma-ket yo\'qlik → faqat 3 hisoblanadi', () => {
    const recs = seq(rate, A, A, A, A);
    expect(billableCost(recs)).toBe(Math.round(3 * rate));
  });

  it('ARALASH narx: eski darslar eski rate, yangilari yangi rate bilan (retroaktiv qayta hisob YO\'Q)', () => {
    // 6 dars 30000 rate, keyin narx oshgan: 6 dars 40000 rate — hammasi present
    const recs = [
      ...Array(6).fill(0).map((_, i) => ({ scheduledDate: `2026-07-0${i + 1}`, present: P, rate: 30000 })),
      ...Array(6).fill(0).map((_, i) => ({ scheduledDate: `2026-08-0${i + 1}`, present: P, rate: 40000 })),
    ];
    // Snapshot: 6×30000 + 6×40000 = 420000 (joriy narxda 12×40000=480000 EMAS)
    expect(billableCost(recs)).toBe(420000);
  });

  it('bo\'sh → 0', () => {
    expect(billableCost([])).toBe(0);
  });
});
