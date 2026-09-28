import { describe, it, expect } from 'vitest';
import { resolveBrand, paletteFromHex, BRAND_NAME, BRAND_SHORT, BRAND_COLORS, BRAND_INITIAL, LOGO, BRAND_MANIFEST_ICON } from '@/lib/brand';

describe('resolveBrand', () => {
  it('sozlamasiz — env brendi aynan o\'zgarishsiz', () => {
    const b = resolveBrand({ brandName: '', brandColor: '', brandLogo: '' });
    expect(b.name).toBe(BRAND_NAME);
    expect(b.short).toBe(BRAND_SHORT);
    expect(b.colors).toBe(BRAND_COLORS);
    expect(b.initial).toBe(BRAND_INITIAL);
    expect(b.logo).toBe(LOGO);
    expect(b.manifestIcon).toBe(BRAND_MANIFEST_ICON);
    expect(b.customLogo).toBeNull();
    expect(resolveBrand()).toEqual(b);
  });

  it('nom o\'zgarsa — wordmark/belgi va yangi initsial', () => {
    const b = resolveBrand({ brandName: '  Nur Academy ' });
    expect(b.name).toBe('Nur Academy');
    expect(b.initial).toBe('N');
    expect(b.logo.sidebarMark.kind).toBe('mark');
    expect(b.logo.topbarWhite.kind).toBe('wordmark');
    expect(b.manifestIcon.src).toBe('/icon');
  });

  it('rang tanlansa — primary aynan shu rang, palitra hex', () => {
    const b = resolveBrand({ brandColor: '#16A34A' });
    expect(b.colors.primary).toBe('#16a34a');
    for (const c of Object.values(b.colors)) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('noto\'g\'ri rang e\'tiborsiz qoldiriladi', () => {
    expect(resolveBrand({ brandColor: 'red' }).colors).toBe(BRAND_COLORS);
  });

  it('logo yuklansa — barcha slotlar rasm', () => {
    const logo = 'data:image/png;base64,AAAA';
    const b = resolveBrand({ brandLogo: logo });
    expect(b.customLogo).toBe(logo);
    for (const s of Object.values(b.logo)) expect(s.src).toBe(logo);
  });

  it('paletteFromHex: dark < primary < light yorug\'likda', () => {
    const p = paletteFromHex('#2660A4');
    const lum = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    expect(lum(p.primaryDark)).toBeLessThan(lum(p.primary));
    expect(lum(p.primaryLight)).toBeGreaterThan(lum(p.primary));
  });
});
