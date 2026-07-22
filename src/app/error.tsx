'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Route-segment error boundary.
 * Kutilmagan xatolarda buzuq UI o'rniga toza xato sahifasi ko'rsatadi.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Xatoni kuzatuv tizimiga yuborish uchun joy (Sentry va h.k.)
    console.error('[UI Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Nimadir xato ketdi</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Kutilmagan xatolik yuz berdi. Iltimos, qayta urinib ko&apos;ring yoki keyinroq qaytadan kiring.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">Xato kodi: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Qayta urinish
        </button>
      </div>
    </div>
  );
}
