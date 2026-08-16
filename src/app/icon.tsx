import { ImageResponse } from 'next/og';
import { BRAND_COLORS, BRAND_INITIAL } from '@/lib/brand';

// Brauzer yorlig'i ikonasi (favicon). Brendga qarab harf+gradient.
// Zyron demo'da Aka-Uka favicon.ico o'rniga to'g'ri "Z" chiqadi.
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
          background: `linear-gradient(135deg, ${BRAND_COLORS.accent} 0%, ${BRAND_COLORS.primary} 100%)`,
          color: '#ffffff',
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        {BRAND_INITIAL}
      </div>
    ),
    { ...size },
  );
}
