import { ImageResponse } from 'next/og';
import { getBrand } from '@/lib/brand-server';

// Brauzer yorlig'i ikonasi (favicon). Brendga qarab harf+gradient.
// Zyron demo'da Aka-Uka favicon.ico o'rniga to'g'ri "Z" chiqadi.
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';
// Brend DB'dan o'qiladi — statik generatsiya qilinmasin.
export const dynamic = 'force-dynamic';

export default async function Icon() {
  const { colors, initial, customLogo } = await getBrand();
  if (customLogo) {
    // Yuklangan logo — oq fonda, markazda
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: 7 }}>
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
          borderRadius: 7,
          background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)`,
          color: '#ffffff',
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        {initial}
      </div>
    ),
    { ...size },
  );
}
