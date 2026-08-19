'use client';

import { useEffect, useState } from 'react';
import { Send, X, BarChart3, CalendarCheck, Trophy, Wallet } from 'lucide-react';

const DISMISS_KEY = 'tg_modal_dismissed';

// Ota-ona hali Telegramga ulanmagan bo'lsa — botga ulanish taklifi.
// Ko'rsatiladi: !linked && localStorage'da "keyinroq" belgilanmagan.
export function TelegramConnectModal({ linked }: { linked: boolean }) {
  const [open, setOpen] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);

  useEffect(() => {
    if (linked) {
      // Ulangan — kelgusi qayta-ulanish taklifi ishlashi uchun belgini tozalaymiz
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
      return;
    }
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1'; } catch {}
    if (dismissed) return;

    let alive = true;
    fetch('/api/parent/telegram-link')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!alive || !data || data.linked || !data.deepLink) return;
        setDeepLink(data.deepLink);
        setOpen(true);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [linked]);

  if (!open || !deepLink) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={dismiss} />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-800 shadow-2xl toast-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Sarlavha — Telegram ko'k gradient */}
        <div className="relative bg-gradient-to-br from-sky-500 to-blue-600 px-6 pt-7 pb-8 text-white">
          <button
            onClick={dismiss}
            aria-label="Yopish"
            className="absolute right-4 top-4 rounded-full p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Send className="h-7 w-7" />
          </div>
          <h2 className="text-center text-xl font-extrabold">Telegram orqali kuzatib boring</h2>
          <p className="mt-1.5 text-center text-sm text-white/85">
            Farzandingiz ma&apos;lumotlari doim qo&apos;lingizda — bir marta ulang, kifoya.
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: BarChart3, label: 'Baholar', cls: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
              { icon: CalendarCheck, label: 'Davomat', cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
              { icon: Trophy, label: 'Reyting', cls: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
              { icon: Wallet, label: 'Qarzdorlik', cls: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30' },
            ].map(({ icon: Icon, label, cls }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-xl border border-slate-100 dark:border-slate-700 px-3 py-2.5">
                <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${cls}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
              </div>
            ))}
          </div>

          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:from-sky-600 hover:to-blue-700 transition-all"
          >
            <Send className="h-4 w-4" /> Telegram&apos;ga ulanish
          </a>
          <button
            onClick={dismiss}
            className="mt-2 w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            Keyinroq
          </button>
        </div>
      </div>
    </div>
  );
}
