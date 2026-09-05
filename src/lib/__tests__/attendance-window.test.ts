import { describe, it, expect } from 'vitest';
import { attendanceWindow, canTeacherMark, parseDurationHours } from '@/lib/api-utils';

// Davomat oynasi: [dars boshlanishidan 15 min oldin, dars tugashi + 2 soat grace].
// Misol: 18:00 boshlanadi, "3 soat" → tugash 21:00, windowEnd 23:00.

describe('parseDurationHours', () => {
  it('matndan soatni ajratadi', () => {
    expect(parseDurationHours('3 soat')).toBe(3);
    expect(parseDurationHours('1.5 soat')).toBe(1.5);
    expect(parseDurationHours(undefined)).toBe(1.5); // default
    expect(parseDurationHours('')).toBe(1.5);
  });
});

describe('attendanceWindow', () => {
  it('windowStart = dars boshlanishidan 15 min oldin', () => {
    const { windowStart } = attendanceWindow('2026-07-23', '18:00', '3 soat');
    expect(windowStart).toEqual(new Date(2026, 6, 23, 17, 45));
  });

  it('lessonEnd = boshlanish + duration', () => {
    const { lessonEnd } = attendanceWindow('2026-07-23', '18:00', '3 soat');
    expect(lessonEnd).toEqual(new Date(2026, 6, 23, 21, 0));
  });

  it('windowEnd = dars tugashi + 2 soat grace', () => {
    const { windowEnd } = attendanceWindow('2026-07-23', '18:00', '3 soat');
    expect(windowEnd).toEqual(new Date(2026, 6, 23, 23, 0));
  });

  it('duration berilmasa default 1.5 soat', () => {
    const { windowEnd } = attendanceWindow('2026-07-23', '18:00');
    expect(windowEnd).toEqual(new Date(2026, 6, 23, 21, 30)); // 18:00 +1.5 +2 = 21:30
  });

  it('yarim tundan oshsa keyingi kunga o\'tadi', () => {
    const { windowEnd } = attendanceWindow('2026-07-23', '23:00', '2 soat'); // tugash 01:00, +2 = 03:00 (ertasi)
    expect(windowEnd).toEqual(new Date(2026, 6, 24, 3, 0));
  });
});

describe('canTeacherMark', () => {
  const date = '2026-07-23';
  const time = '18:00';
  const dur = '3 soat'; // tugash 21:00, windowEnd 23:00

  it('dars boshlanishidan oldin (windowStart 17:45 gacha) — MUMKIN EMAS', () => {
    expect(canTeacherMark(date, time, dur, new Date(2026, 6, 23, 17, 0))).toBe(false);
  });
  it('windowStart aynan (17:45) — MUMKIN', () => {
    expect(canTeacherMark(date, time, dur, new Date(2026, 6, 23, 17, 45))).toBe(true);
  });
  it('dars vaqtida — MUMKIN', () => {
    expect(canTeacherMark(date, time, dur, new Date(2026, 6, 23, 18, 30))).toBe(true);
  });
  it('dars tugagach grace ichida (22:30) — MUMKIN', () => {
    expect(canTeacherMark(date, time, dur, new Date(2026, 6, 23, 22, 30))).toBe(true);
  });
  it('windowEnd aynan (23:00) — MUMKIN', () => {
    expect(canTeacherMark(date, time, dur, new Date(2026, 6, 23, 23, 0))).toBe(true);
  });
  it('grace tugagach (23:01) — MUMKIN EMAS', () => {
    expect(canTeacherMark(date, time, dur, new Date(2026, 6, 23, 23, 1))).toBe(false);
  });
});
