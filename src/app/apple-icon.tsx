import { ImageResponse } from 'next/og';
import { getBrand } from '@/lib/brand-server';

// iOS "Bosh ekranga qo'shish" ikonasi. iOS o'zi burchaklarni yumaltiradi,
// shu sabab to'liq gradient fon + markazda brend harfi.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
// Brend DB'dan o'qiladi — statik generatsiya qilinmasin.
export const dynamic = 'force-dynamic';

export default async function AppleIcon() {
  const { colors, initial, customLogo } = await getBrand();
  if (customLogo) {
    // Yuklangan logo — oq fonda, markazda
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
          <img src={customLogo} alt="" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
        </div>
      ),
      { ...size },
    );
  }
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)`,
          color: '#ffffff',
          fontSize: 112,
          fontWeight: 800,
        }}
      >
        {initial}
      </div>
    ),
    { ...size },
  );
}
