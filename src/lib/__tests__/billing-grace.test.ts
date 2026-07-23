import { describe, it, expect } from 'vitest';
import { computeBillable, ABSENCE_GRACE } from '@/lib/billing';

// Yordamchi: present/absent ketma-ketligidan records yasash
const seq = (...presents: boolean[]) =>
  presents.map((present, i) => ({ scheduledDate: `2026-07-${String(i + 1).padStart(2, '0')}`, present }));
const P = true, A = false;

describe('computeBillable — "joy band" grace qoidasi', () => {
  it('grace chegarasi 3', () => {
    expect(ABSENCE_GRACE).toBe(3);
  });

  it('hammasi present → hammasi billable', () => {
    const r = computeBillable(seq(P, P, P, P));
    expect(r.billableCount).toBe(4);
    expect(r.currentAbsenceStreak).toBe(0);
  });

  it('3 ketma-ket yo\'qlik → 3 tasi ham billable', () => {
    const r = computeBillable(seq(A, A, A));
    expect(r.billableCount).toBe(3);
    expect(r.currentAbsenceStreak).toBe(3);
  });

  it('4 ketma-ket yo\'qlik → faqat 3 billable, 4-si emas', () => {
    const r = computeBillable(seq(A, A, A, A));
    expect(r.billableCount).toBe(3);
    expect(r.currentAbsenceStreak).toBe(4); // > 3 → tushib qolgan
  });

  it('present + 4 yo\'qlik → 1 + 3 = 4 billable', () => {
    const r = computeBillable(seq(P, A, A, A, A));
    expect(r.billableCount).toBe(4);
    expect(r.currentAbsenceStreak).toBe(4);
  });

  it('4 yo\'qlik + present (qaytish) → 3 + 1 billable, streak nol', () => {
    const r = computeBillable(seq(A, A, A, A, P));
    expect(r.billableCount).toBe(4); // 3 grace + 1 present (4-yo'qlik hisoblanmaydi)
    expect(r.currentAbsenceStreak).toBe(0); // qaytdi
  });

  it('2 yo\'qlik, present, 2 yo\'qlik → hammasi billable (streak hech qachon 3 dan oshmaydi)', () => {
    const r = computeBillable(seq(A, A, P, A, A));
    expect(r.billableCount).toBe(5);
    expect(r.currentAbsenceStreak).toBe(2);
  });

  it('3 yo\'qlik, present, 3 yo\'qlik → hammasi billable', () => {
    const r = computeBillable(seq(A, A, A, P, A, A, A));
    expect(r.billableCount).toBe(7);
    expect(r.currentAbsenceStreak).toBe(3);
  });

  it('bo\'sh → 0', () => {
    const r = computeBillable([]);
    expect(r.billableCount).toBe(0);
    expect(r.currentAbsenceStreak).toBe(0);
  });
});
