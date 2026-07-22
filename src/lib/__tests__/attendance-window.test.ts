import { describe, it, expect } from 'vitest';
import { attendanceWindow, canTeacherMark } from '@/lib/api-utils';

describe('attendanceWindow', () => {
  it('windowStart = dars boshlanishidan 15 min oldin', () => {
    const { windowStart } = attendanceWindow('2026-07-23', '18:00');
    expect(windowStart).toEqual(new Date(2026, 6, 23, 17, 45));
  });

  it('dayEnd = dars kunining ertasi 00:00', () => {
    const { dayEnd } = attendanceWindow('2026-07-23', '18:00');
    expect(dayEnd).toEqual(new Date(2026, 6, 24, 0, 0, 0));
  });

  it('oy oxiri to\'g\'ri o\'tadi (31-dekabr → 1-yanvar)', () => {
    const { dayEnd } = attendanceWindow('2026-12-31', '10:00');
    expect(dayEnd).toEqual(new Date(2027, 0, 1, 0, 0, 0));
  });
});

describe('canTeacherMark', () => {
  const date = '2026-07-23';
  const time = '18:00';

  it('dars boshlanishidan oldin — MUMKIN EMAS', () => {
    const now = new Date(2026, 6, 23, 17, 0); // 17:00, windowStart 17:45 dan oldin
    expect(canTeacherMark(date, time, now)).toBe(false);
  });

  it('windowStart aynan — MUMKIN', () => {
    const now = new Date(2026, 6, 23, 17, 45);
    expect(canTeacherMark(date, time, now)).toBe(true);
  });

  it('dars vaqtida — MUMKIN', () => {
    const now = new Date(2026, 6, 23, 18, 30);
    expect(canTeacherMark(date, time, now)).toBe(true);
  });

  it('dars kuni kechqurun (muhlat ichida) — MUMKIN', () => {
    const now = new Date(2026, 6, 23, 23, 59);
    expect(canTeacherMark(date, time, now)).toBe(true);
  });

  it('ertasi kun (muhlat tugagan) — MUMKIN EMAS', () => {
    const now = new Date(2026, 6, 24, 0, 1);
    expect(canTeacherMark(date, time, now)).toBe(false);
  });
});
