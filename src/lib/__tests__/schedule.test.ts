import { describe, it, expect } from 'vitest';
import { computeLessonDates, isLessonDay, dayTypeLabel } from '@/lib/schedule';

// 2026-sentabr hafta kunlari (mos yozuvlar uchun): 01=Sesh, 02=Chor, 03=Pay, 04=Jum,
// 05=Shan, 06=Yak, 07=Dush, 08=Sesh, 09=Chor, 10=Pay, 11=Jum, 12=Shan ...

describe('computeLessonDates — sof kalendar hisobi', () => {
  it('toq = Dush/Chor/Jum kunlarini beradi (endDate inklyuziv)', () => {
    const d = computeLessonDates({ startDate: '2026-09-07', dayType: 'toq', endDate: '2026-09-11' });
    expect(d).toEqual(['2026-09-07', '2026-09-09', '2026-09-11']); // Dush, Chor, Jum
  });

  it('juft = Sesh/Pay/Shan kunlarini beradi', () => {
    const d = computeLessonDates({ startDate: '2026-09-05', dayType: 'juft', endDate: '2026-09-12' });
    expect(d).toEqual(['2026-09-05', '2026-09-08', '2026-09-10', '2026-09-12']); // Shan, Sesh, Pay, Shan
  });

  it('months=1: sentabrda 13 ta toq kun', () => {
    const d = computeLessonDates({ startDate: '2026-09-01', dayType: 'toq', months: 1 });
    expect(d.length).toBe(13);
    expect(d[0]).toBe('2026-09-02'); // birinchi Chor
    expect(d[d.length - 1]).toBe('2026-09-30');
  });

  it('endDate months ustidan ustuvor', () => {
    const d = computeLessonDates({ startDate: '2026-09-01', dayType: 'juft', months: 12, endDate: '2026-09-05' });
    expect(d).toEqual(['2026-09-01', '2026-09-03', '2026-09-05']); // Sesh, Pay, Shan
  });

  it('noma\'lum / boshqa dayType → xato (avtomatik jadval yo\'q)', () => {
    expect(() => computeLessonDates({ startDate: '2026-09-01', dayType: 'boshqa' })).toThrow();
    expect(() => computeLessonDates({ startDate: '2026-09-01', dayType: 'xyz' })).toThrow();
  });

  it('bo\'sh oralig\'А → bo\'sh massiv', () => {
    // Yakshanba–yakshanba (juft/toq kun yo'q)
    const d = computeLessonDates({ startDate: '2026-09-06', dayType: 'toq', endDate: '2026-09-06' });
    expect(d).toEqual([]);
  });
});

describe('isLessonDay', () => {
  it('toq: Dush(07) true, Sesh(08) false', () => {
    expect(isLessonDay('toq', '2026-09-07')).toBe(true);
    expect(isLessonDay('toq', '2026-09-08')).toBe(false);
  });
  it('juft: Shan(05) true, Jum(04) false', () => {
    expect(isLessonDay('juft', '2026-09-05')).toBe(true);
    expect(isLessonDay('juft', '2026-09-04')).toBe(false);
  });
  it('boshqa / noma\'lum → cheklanmaydi (true)', () => {
    expect(isLessonDay('boshqa', '2026-09-06')).toBe(true);
    expect(isLessonDay(null, '2026-09-06')).toBe(true);
  });
});

describe('dayTypeLabel', () => {
  it('yorliqlar', () => {
    expect(dayTypeLabel('toq')).toBe('Toq (Dush/Chor/Jum)');
    expect(dayTypeLabel('juft')).toBe('Juft (Sesh/Pay/Shan)');
    expect(dayTypeLabel('boshqa')).toBe('Boshqa');
  });
});
