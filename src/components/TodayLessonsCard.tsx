'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronDown, Clock, MapPin } from 'lucide-react';

export interface TodayLesson {
  id: string;
  time: string;                 // "14:00"
  groupName: string;
  subject?: string;
  meta?: string;                // admin: ustoz ismi; teacher: mavzu (ixtiyoriy)
  room?: string;
  href?: string;                // bosilsa — guruh sahifasiga (ixtiyoriy)
  status?: { label: string; tone: 'ok' | 'warn' | 'muted' };
}

const TONE: Record<string, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
  warn: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
  muted: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
};

const ROW_CLS =
  'flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors';

export function TodayLessonsCard({
  lessons,
  title = 'Bugungi darslar',
  defaultOpen = false,
}: {
  lessons: TodayLesson[];
  title?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const rowInner = (l: TodayLesson): ReactNode => (
    <>
      <div className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200 w-16 flex-shrink-0">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        {l.time || '—'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
          {l.groupName}
          {l.subject ? <span className="text-slate-400 font-normal"> · {l.subject}</span> : null}
        </p>
        {(l.meta || l.room) && (
          <p className="text-xs text-slate-400 truncate flex items-center gap-1">
            {l.meta && <span className="truncate">{l.meta}</span>}
            {l.meta && l.room && <span>·</span>}
            {l.room && (
              <span className="inline-flex items-center gap-0.5 flex-shrink-0">
                <MapPin className="w-3 h-3" />
                {l.room}
              </span>
            )}
          </p>
        )}
      </div>
      {l.status && (
        <span className={`flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${TONE[l.status.tone]}`}>
          {l.status.label}
        </span>
      )}
    </>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-amber-500" />
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{title}</p>
            <p className="text-xs text-slate-400">Bugun</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            {lessons.length} ta
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        lessons.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400 border-t border-slate-100 dark:border-slate-700">
            Bugun dars yo&apos;q
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700 border-t border-slate-100 dark:border-slate-700">
            {lessons.map(l =>
              l.href ? (
                <Link key={l.id} href={l.href} className={ROW_CLS}>
                  {rowInner(l)}
                </Link>
              ) : (
                <div key={l.id} className={ROW_CLS}>
                  {rowInner(l)}
                </div>
              ),
            )}
          </div>
        )
      )}
    </div>
  );
}
