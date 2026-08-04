'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

// Yengil, tashqi bog'liqliksiz confirm modal (native confirm() o'rnini bosadi).
// Ishlatish:  if (!(await confirmDialog("O'chirasizmi?", { danger: true }))) return;
// <ConfirmDialog/> root layout'da bir marta o'rnatiladi.

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}
interface Pending extends ConfirmOptions { id: number; message: string; resolve: (v: boolean) => void; }

let current: Pending | null = null;
type Listener = (p: Pending | null) => void;
const listeners = new Set<Listener>();
let counter = 0;
function emit() { listeners.forEach(l => l(current)); }

export function confirmDialog(message: string, opts: ConfirmOptions = {}): Promise<boolean> {
  return new Promise(resolve => {
    if (current) current.resolve(false); // ochiq bo'lsa oldingisini bekor qilamiz
    current = { id: ++counter, message, ...opts, resolve };
    emit();
  });
}

function close(result: boolean) {
  if (current) { current.resolve(result); current = null; emit(); }
}

export function ConfirmDialog() {
  const [p, setP] = useState<Pending | null>(null);

  useEffect(() => {
    const l: Listener = setP;
    listeners.add(l);
    setP(current);
    return () => { listeners.delete(l); };
  }, []);

  useEffect(() => {
    if (!p) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [p]);

  if (!p) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50"
      onClick={() => close(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="toast-in w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${p.danger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              {p.title && <h3 className="text-base font-bold text-slate-900 mb-1">{p.title}</h3>}
              <p className="text-sm text-slate-600 whitespace-pre-line break-words">{p.message}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end px-5 py-3 bg-slate-50 border-t border-slate-100">
          <button
            autoFocus={p.danger}
            onClick={() => close(false)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            {p.cancelText || 'Bekor'}
          </button>
          <button
            autoFocus={!p.danger}
            onClick={() => close(true)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${p.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2660A4] hover:bg-[#1f4f88]'}`}
          >
            {p.confirmText || 'Ha'}
          </button>
        </div>
      </div>
    </div>
  );
}
