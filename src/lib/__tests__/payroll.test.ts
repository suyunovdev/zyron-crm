import { describe, it, expect } from 'vitest';
import { teacherSalary } from '@/lib/payroll';

describe('teacherSalary', () => {
  it('tushumdan ulush % ni hisoblaydi', () => {
    expect(teacherSalary(1000000, 40)).toBe(400000);
    expect(teacherSalary(233333, 50)).toBe(116667); // yaxlitlangan
  });
  it('0% → 0', () => {
    expect(teacherSalary(500000, 0)).toBe(0);
  });
  it('100% → to\'liq tushum', () => {
    expect(teacherSalary(500000, 100)).toBe(500000);
  });
});
