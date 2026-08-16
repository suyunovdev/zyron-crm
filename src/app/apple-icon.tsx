import { ImageResponse } from 'next/og';
import { BRAND_COLORS, BRAND_INITIAL } from '@/lib/brand';

// iOS "Bosh ekranga qo'shish" ikonasi. iOS o'zi burchaklarni yumaltiradi,
// shu sabab to'liq gradient fon + markazda brend harfi.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${BRAND_COLORS.accent} 0%, ${BRAND_COLORS.primary} 100%)`,
          color: '#ffffff',
          fontSize: 112,
          fontWeight: 800,
        }}
      >
        {BRAND_INITIAL}
      </div>
    ),
    { ...size },
  );
}
