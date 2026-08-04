'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

// Yengil, tashqi bog'liqliksiz toast tizimi (toastify o'rnini bosadi).
// Har joydan chaqiriladi: toast.success('...'), toast.error('...'), toast.info('...').
// <Toaster/> root layout'da bir marta o'rnatiladi.

export type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; type: ToastType; message: string; }

type Listener = (items: ToastItem[]) => void;
let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let counter = 0;

function emit() { listeners.forEach(l => l([...items])); }
function remove(id: number) { items = items.filter(t => t.id !== id); emit(); }
function add(type: ToastType, message: string) {
  const id = ++counter;
  items = [...items, { id, type, message }];
  emit();
  const ttl = type === 'error' ? 5000 : 3500;
  setTimeout(() => remove(id), ttl);
  return id;
}

export const toast = {
  success: (m: string) => add('success', m),
  error: (m: string) => add('error', m),
  info: (m: string) => add('info', m),
};

const CONFIG: Record<ToastType, { Icon: typeof Info; accent: string; icon: string }> = {
  success: { Icon: CheckCircle2, accent: 'border-l-emerald-500', icon: 'text-emerald-500' },
  error: { Icon: XCircle, accent: 'border-l-red-500', icon: 'text-red-500' },
  info: { Icon: Info, accent: 'border-l-blue-500', icon: 'text-blue-500' },
};

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>([]);

  useEffect(() => {
    const l: Listener = setList;
    listeners.add(l);
    setList([...items]);
    return () => { listeners.delete(l); };
  }, []);

  if (list.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {list.map(t => {
        const c = CONFIG[t.type];
        return (
          <div
            key={t.id}
            role="alert"
            className={`toast-in pointer-events-auto flex items-start gap-3 rounded-lg border border-slate-200 border-l-4 ${c.accent} bg-white shadow-lg px-4 py-3`}
          >
            <c.Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${c.icon}`} />
            <p className="flex-1 text-sm text-slate-800 whitespace-pre-line break-words">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              aria-label="Yopish"
              className="text-slate-400 hover:text-slate-600 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
