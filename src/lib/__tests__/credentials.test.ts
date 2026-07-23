import { describe, it, expect } from 'vitest';
import { loginBase, randomPassword, parentNameFrom } from '@/lib/credentials';

describe('loginBase', () => {
  it('birinchi so\'zdan lotin login asosi', () => {
    expect(loginBase('Adolat Nazarov')).toBe('adolat');
    expect(loginBase('Ali')).toBe('ali');
  });
  it('apostrof va maxsus belgilar olib tashlanadi', () => {
    expect(loginBase("Gʻani Toʻlqin")).toBe('gani');
    expect(loginBase("O'tkir Aliyev")).toBe('otkir');
  });
  it('kirill → lotin', () => {
    expect(loginBase('Адолат Назаров')).toBe('adolat');
  });
  it('bo\'sh/nomaʼlum → fallback', () => {
    expect(loginBase('')).toBe('oquvchi');
    expect(loginBase('!!!')).toBe('oquvchi');
  });
});

describe('randomPassword', () => {
  it('berilgan uzunlik', () => {
    expect(randomPassword(6)).toHaveLength(6);
    expect(randomPassword(8)).toHaveLength(8);
  });
  it('ambiguous belgilarsiz (o,0,l,1,i)', () => {
    for (let i = 0; i < 50; i++) expect(randomPassword(10)).not.toMatch(/[o0l1i]/);
  });
  it('har safar boshqacha (asosan)', () => {
    const set = new Set(Array.from({ length: 20 }, () => randomPassword(6)));
    expect(set.size).toBeGreaterThan(15);
  });
});

describe('parentNameFrom', () => {
  it('familiyadan "... oilasi"', () => {
    expect(parentNameFrom('Adolat Nazarov')).toBe('Nazarov oilasi');
    expect(parentNameFrom('Ali Vali Karimov')).toBe('Karimov oilasi');
  });
  it('bitta so\'z → "... ota-onasi"', () => {
    expect(parentNameFrom('Ali')).toBe('Ali ota-onasi');
  });
});
