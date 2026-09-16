'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export interface StudentLite {
  id: string;
  name: string;
  phone?: string | null;
  login?: string;
}

interface Props {
  /** Tanlangan o'quvchi id (bo'sh bo'lsa qidiruv inputi ko'rinadi) */
  value: string;
  /** Tanlangan o'quvchi ismi (chip ko'rsatish uchun) */
  selectedName?: string;
  /** Tanlanganda (yoki tozalanganda null) chaqiriladi */
  onSelect: (student: StudentLite | null) => void;
  /** Natijalardan chiqarib tashlanadigan id'lar (masalan allaqachon guruhda/bog'langan) */
  excludeIds?: string[];
  placeholder?: string;
  autoFocus?: boolean;
}

// Server-side qidiruvli o'quvchi tanlagich. Barcha o'quvchilarni (1714+) qamraydi —
// yozilgan matn bo'yicha /api/admin/users?search=... (searchName normallashtirilgan, filial-scoped).
// limit=500 native <select> truncate muammosini butunlay hal qiladi.
export function StudentSearchSelect({ value, selectedName, onSelect, excludeIds = [], placeholder, autoFocus }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<StudentLite[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const doSearch = useCallback((term: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (term.trim().length < 1) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users?role=student&status=active&search=${encodeURIComponent(term.trim())}&limit=20&sort=name`);
        const d = await res.json();
        const list: StudentLite[] = Array.isArray(d) ? d : (d.data || []);
        setResults(list.filter(s => !excludeIds.includes(s.id)));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [excludeIds]);

  // Tanlangan holat — chip ko'rinishi
  if (value && selectedName) {
    return (
      <div className="flex items-center justify-between gap-2 w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50">
        <span className="truncate text-slate-800 font-medium">{selectedName}</span>
        <button type="button" onClick={() => { onSelect(null); setQ(''); setResults([]); }}
          className="text-slate-400 hover:text-red-500 flex-shrink-0" title="Tozalash">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="flex items-center gap-2 w-full px-3 py-2.5 border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500/20">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); doSearch(e.target.value); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || "O'quvchini qidiring (ism yoki telefon)"}
          className="w-full text-sm bg-transparent focus:outline-none text-slate-800"
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 flex-shrink-0" />}
      </div>
      {open && q.trim() && (
        <div className="absolute z-[60] mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg divide-y divide-slate-50">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-400 text-center">{loading ? 'Qidirilmoqda…' : 'Topilmadi'}</p>
          ) : results.map(s => (
            <button key={s.id} type="button"
              onClick={() => { onSelect(s); setOpen(false); setQ(''); setResults([]); }}
              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between gap-2">
              <span className="text-sm text-slate-800 truncate">{s.name}</span>
              {s.phone && <span className="text-xs text-slate-400 flex-shrink-0">{s.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
