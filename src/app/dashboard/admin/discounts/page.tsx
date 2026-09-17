'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, BadgePercent } from 'lucide-react';
import { SkeletonTable } from '@/components/skeleton';
import { normalizeSearch } from '@/lib/search';

interface DiscountItem {
  studentId: string;
  studentName: string;
  phone: string | null;
  groupId: string;
  groupName: string;
  teacherName: string;
  discountPercent: number;
  discountAmount: number;
  price: number;
  effectivePrice: number;
}

function fmt(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function DiscountsPage() {
  const router = useRouter();
  const [items, setItems] = useState<DiscountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/discounts')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { setItems(d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = normalizeSearch(search);
    return items.filter(i =>
      normalizeSearch(i.studentName).includes(q) ||
      normalizeSearch(i.groupName).includes(q) ||
      normalizeSearch(i.teacherName).includes(q)
    );
  }, [items, search]);

  const discLabel = (i: DiscountItem) =>
    i.discountPercent > 0 ? `−${i.discountPercent}%` : `−${fmt(i.discountAmount)} so'm/oy`;

  return (
    <div className="space-y-5">
      <button onClick={() => router.push('/dashboard/admin')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> Orqaga
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <BadgePercent className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-bold text-slate-900">Chegirmali o&apos;quvchilar</h1>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="O'quvchi, guruh yoki ustoz..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm">
              {search.trim() ? 'Topilmadi' : 'Chegirma berilgan o\'quvchi yo\'q'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-5 py-3 text-sm font-medium text-slate-500">O&apos;quvchi</th>
                    <th className="px-5 py-3 text-sm font-medium text-slate-500">Guruh</th>
                    <th className="px-5 py-3 text-sm font-medium text-slate-500">Ustoz</th>
                    <th className="px-5 py-3 text-sm font-medium text-slate-500">Chegirma</th>
                    <th className="px-5 py-3 text-sm font-medium text-slate-500 text-right">Kurs narxi</th>
                    <th className="px-5 py-3 text-sm font-medium text-slate-500 text-right">Effektiv narx</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i, idx) => (
                    <tr key={`${i.groupId}-${i.studentId}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <button onClick={() => router.push(`/dashboard/admin/students/${i.studentId}`)}
                          className="text-sm font-medium text-slate-800 hover:text-emerald-600 text-left">
                          <span className="text-xs text-slate-400 mr-1.5">{idx + 1}.</span>{i.studentName}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => router.push(`/dashboard/admin/groups/${i.groupId}`)}
                          className="text-sm text-slate-600 hover:text-emerald-600 text-left">{i.groupName}</button>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{i.teacherName}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                          {discLabel(i)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500 text-right line-through">{fmt(i.price)}</td>
                      <td className="px-5 py-3 text-sm font-bold text-emerald-600 text-right">{fmt(i.effectivePrice)} so&apos;m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && items.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-400">Jami: {filtered.length} ta chegirmali a&apos;zolik</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
