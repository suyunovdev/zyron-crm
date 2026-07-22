import { describe, it, expect } from 'vitest';
import { perLessonRate } from '@/lib/billing';

describe('perLessonRate', () => {
  it('oylik narxni oyiga darslar soniga bo\'ladi', () => {
    expect(perLessonRate(400000, 12)).toBeCloseTo(33333.33, 2);
  });

  it('lessonsPerMonth 0 bo\'lsa 0 qaytaradi (nolga bo\'lish yo\'q)', () => {
    expect(perLessonRate(400000, 0)).toBe(0);
  });

  it('narx 0 bo\'lsa 0', () => {
    expect(perLessonRate(0, 12)).toBe(0);
  });
});

describe('balans cost matematikasi (student/balance & admin/stats bir xil)', () => {
  // cost = round(qatnashgan darslar * perLessonRate)
  const cost = (attended: number, price: number, lpm: number) =>
    Math.round(attended * perLessonRate(price, lpm));

  it('7 dars × (400000/12) = 233333', () => {
    expect(cost(7, 400000, 12)).toBe(233333);
  });

  it('to\'liq oy (12 dars) = to\'liq narx', () => {
    expect(cost(12, 400000, 12)).toBe(400000);
  });

  it('qatnashmagan (0 dars) = 0', () => {
    expect(cost(0, 400000, 12)).toBe(0);
  });

  it('balans = to\'langan − cost (qarzdorlik manfiy)', () => {
    const paid = 200000;
    const c = cost(7, 400000, 12); // 233333
    expect(paid - c).toBe(-33333);
  });
});
