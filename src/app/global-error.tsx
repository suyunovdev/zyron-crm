'use client';

import { useEffect } from 'react';

/**
 * Global error boundary — root layout ishdan chiqqanda ishlaydi.
 * O'zining <html>/<body> tegi bo'lishi shart (layout mavjud emas).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error]', error);
  }, [error]);

  return (
    <html lang="uz">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 22, marginBottom: 8 }}>Tizimda jiddiy xatolik</h1>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
              Ilovani yuklab bo&apos;lmadi. Iltimos, sahifani yangilang.
            </p>
            <button
              onClick={reset}
              style={{
                background: '#2660A4',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Qayta urinish
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
