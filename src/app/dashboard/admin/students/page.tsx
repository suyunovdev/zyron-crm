'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X, ChevronUp, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface GroupInfo {
  id: string;
  name: string;
  subject: string;
  teacher: { id: string; name: string } | null;
}

interface BalanceInfo {
  totalPaid: number;
  paidThisMonth: number;
  totalDeducted: number;
  balance: number;
}

interface Student {
  id: string;
  name: string;
  login: string;
  phone: string;
  status: string;
  createdAt: string;
  groupStudents: { group: GroupInfo }[];
  _balance?: BalanceInfo;
}

interface FormData {
  name: string;
  login: string;
  password: string;
  phone: string;
}

type SortKey = 'name' | 'group' | 'mentor' | 'subject';
type SortDir = 'asc' | 'desc';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktivlar' },
  { value: 'all', label: 'Hammasi' },
  { value: 'frozen', label: 'Muzlatilganlar' },
  { value: 'archived', label: 'Arxivlanganlar' },
];

const STATUS_BADGE: Record<string, { text: string; cls: string }> = {
  active: { text: 'Aktiv', cls: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  frozen: { text: 'Muzlatilganlar', cls: 'bg-slate-100 text-slate-500 border border-slate-200' },
  archived: { text: 'Arxivlangan', cls: 'bg-red-50 text-red-500 border border-red-200' },
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({ name: '', login: '', password: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdCreds, setCreatedCreds] = useState<{
    login: string; name: string; password: string;
    parent: { login: string; name: string; password: string } | null;
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchStudents = () => {
    setLoading(true);
    fetch('/api/admin/users?role=student&limit=500')
      .then(res => res.ok ? res.json() : { data: [] })
      .then(resp => {
        setStudents(Array.isArray(resp) ? resp : (resp.data || []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // login/parol yuborilmaydi — server avtomatik generatsiya qiladi (student + ota-ona)
        body: JSON.stringify({ name: formData.name, phone: formData.phone || undefined, role: 'student' }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || 'Xatolik yuz berdi');
      } else {
        setShowModal(false);
        setFormData({ name: '', login: '', password: '', phone: '' });
        setCreatedCreds(d); // generatsiya qilingan login/parollarni ko'rsatamiz
        fetchStudents();
      }
    } catch {
      setError("Server bilan bog'lanishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePatch = async (id: string, status: string) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    fetchStudents();
  };

  const getFirstGroup = (s: Student) => s.groupStudents?.[0]?.group || null;
  const getMentor = (s: Student) => getFirstGroup(s)?.teacher?.name || '';
  const getGroupName = (s: Student) => getFirstGroup(s)?.name || '';
  const getSubject = (s: Student) => getFirstGroup(s)?.subject || '';

  const filtered = useMemo(() => {
    let list = students.filter(s => {
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) ||
          s.phone?.toLowerCase().includes(q) ||
          getGroupName(s).toLowerCase().includes(q) ||
          getMentor(s).toLowerCase().includes(q);
      }
      return true;
    });

    list.sort((a, b) => {
      let valA = '', valB = '';
      switch (sortKey) {
        case 'name': valA = a.name; valB = b.name; break;
        case 'group': valA = getGroupName(a); valB = getGroupName(b); break;
        case 'mentor': valA = getMentor(a); valB = getMentor(b); break;
        case 'subject': valA = getSubject(a); valB = getSubject(b); break;
      }
      const cmp = valA.localeCompare(valB, 'uz');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [students, search, filterStatus, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedStudents = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page when filter/search changes
  useEffect(() => { setCurrentPage(1); }, [search, filterStatus]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="inline-flex flex-col ml-1 -space-y-1">
      <ChevronUp className={`w-3 h-3 ${sortKey === col && sortDir === 'asc' ? 'text-slate-800' : 'text-slate-300'}`} />
      <ChevronDown className={`w-3 h-3 ${sortKey === col && sortDir === 'desc' ? 'text-slate-800' : 'text-slate-300'}`} />
    </span>
  );

  const formatPhone = (phone: string) => {
    if (!phone) return '—';
    return phone;
  };

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Studentlar</h1>

          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            {/* Search */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="O'quvchini qidirish"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white placeholder:text-slate-400"
              />
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[140px]"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Yangi qo&apos;shish
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-400 text-sm">Yuklanmoqda...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm">O&apos;quvchilar topilmadi</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th
                      className="text-left px-5 py-3.5 text-sm font-medium text-slate-500 cursor-pointer select-none hover:text-slate-700"
                      onClick={() => toggleSort('name')}
                    >
                      O&apos;quvchi <SortIcon col="name" />
                    </th>
                    <th className="text-center px-5 py-3.5 text-sm font-medium text-slate-500">
                      Telefon raqami
                    </th>
                    <th
                      className="text-center px-5 py-3.5 text-sm font-medium text-slate-500 cursor-pointer select-none hover:text-slate-700"
                      onClick={() => toggleSort('mentor')}
                    >
                      Mentor <SortIcon col="mentor" />
                    </th>
                    <th
                      className="text-center px-5 py-3.5 text-sm font-medium text-slate-500 cursor-pointer select-none hover:text-slate-700"
                      onClick={() => toggleSort('group')}
                    >
                      Guruh <SortIcon col="group" />
                    </th>
                    <th
                      className="text-center px-5 py-3.5 text-sm font-medium text-slate-500 cursor-pointer select-none hover:text-slate-700"
                      onClick={() => toggleSort('subject')}
                    >
                      Yo&apos;nalish <SortIcon col="subject" />
                    </th>
                    <th className="text-center px-5 py-3.5 text-sm font-medium text-slate-500">
                      Balans
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student, idx) => {
                    const badge = STATUS_BADGE[student.status] || STATUS_BADGE.active;
                    const group = getFirstGroup(student);
                    const mentor = group?.teacher?.name || '—';
                    const groupName = group?.name || '—';
                    const subject = group?.subject || '—';
                    const bal = student._balance;
                    const isPaid = bal ? bal.balance > 0 : false;
                    const isDebtor = bal ? bal.balance <= 0 && bal.totalDeducted > 0 : false;
                    return (
                      <tr
                        key={student.id}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                      >
                        {/* O'quvchi */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              student.status !== 'active' ? (student.status === 'frozen' ? 'bg-blue-400' : 'bg-slate-300') :
                              isPaid ? 'bg-emerald-500' : isDebtor ? 'bg-red-500' : 'bg-amber-400'
                            }`} />
                            <Link
                              href={`/dashboard/admin/students/${student.id}`}
                              className="text-sm text-slate-800 hover:text-blue-600 hover:underline transition-colors"
                            >
                              <span className="text-slate-400 mr-0.5">{idx + 1}.</span>
                              {student.name}
                            </Link>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${badge.cls}`}>
                              {badge.text}
                            </span>
                          </div>
                        </td>

                        {/* Telefon */}
                        <td className="px-5 py-3 text-center">
                          {student.phone ? (
                            <a
                              href={`tel:${student.phone.replace(/\s/g, '')}`}
                              onClick={e => e.stopPropagation()}
                              className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
                            >
                              {formatPhone(student.phone)}
                            </a>
                          ) : (
                            <span className="text-sm text-slate-300">—</span>
                          )}
                        </td>

                        {/* Mentor */}
                        <td className="px-5 py-3 text-center">
                          <span className="text-sm text-slate-700">{mentor}</span>
                        </td>

                        {/* Guruh */}
                        <td className="px-5 py-3 text-center">
                          <span className="text-sm font-medium text-slate-700">{groupName}</span>
                          {student.groupStudents.length > 1 && (
                            <span className="ml-1 text-[10px] text-slate-400">
                              +{student.groupStudents.length - 1}
                            </span>
                          )}
                        </td>

                        {/* Yo'nalish */}
                        <td className="px-5 py-3 text-center">
                          <span className="text-sm text-slate-600">{subject}</span>
                        </td>

                        {/* Balans */}
                        <td className="px-5 py-3 text-center">
                          {bal ? (
                            <div>
                              <span className={`text-sm font-bold ${
                                bal.balance > 0 ? 'text-emerald-600' : bal.balance < 0 ? 'text-red-600' : 'text-slate-400'
                              }`}>
                                {bal.balance > 0 ? '+' : ''}{bal.balance.toLocaleString()}
                              </span>
                              <span className={`block text-[10px] font-medium ${
                                bal.paidThisMonth > 0 ? 'text-emerald-500' : 'text-red-400'
                              }`}>
                                {bal.paidThisMonth > 0 ? "To'langan" : "To'lanmagan"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Count footer */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Jami: {filtered.length} ta o&apos;quvchi
                {filterStatus !== 'all' && ` (${STATUS_OPTIONS.find(o => o.value === filterStatus)?.label})`}
              </span>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  To&apos;lagan: {filtered.filter(s => s._balance && s._balance.balance > 0).length}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Qarzdor: {filtered.filter(s => s._balance && s._balance.balance <= 0 && s._balance.totalDeducted > 0).length}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Yangi: {filtered.filter(s => !s._balance || s._balance.totalDeducted === 0).length}
                </span>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                Oldingi
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .map((p, i, arr) => (
                  <span key={p} className="flex items-center">
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-slate-300">...</span>}
                    <button onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium ${
                        p === currentPage ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}>
                      {p}
                    </button>
                  </span>
                ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                Keyingi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Yangi o&apos;quvchi qo&apos;shish</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ism familiya *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Abdullayev Ali"
                />
              </div>
              <div className="flex items-start gap-2 bg-blue-50 text-blue-700 text-xs px-3 py-2.5 rounded-lg">
                <span>🔑</span>
                <span>Login va parol <b>avtomatik</b> yaratiladi — o&apos;quvchi uchun ham, ota-ona uchun ham (unique).</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="+998 90 123 45 67"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? 'Saqlanmoqda...' : "Qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generatsiya qilingan login/parollar */}
      {createdCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCreatedCreds(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center mb-5">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-2 text-xl">✅</div>
              <h2 className="text-lg font-bold text-slate-900">O&apos;quvchi yaratildi</h2>
              <p className="text-xs text-slate-500 mt-1">Login va parollarni saqlab oling — ularni topshiring</p>
            </div>

            {[
              { title: "👤 O'quvchi", who: createdCreds },
              ...(createdCreds.parent ? [{ title: '👪 Ota-ona', who: createdCreds.parent }] : []),
            ].map((blk, i) => (
              <div key={i} className="mb-3 rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">{blk.title} — {blk.who.name}</div>
                {([['Login', blk.who.login], ['Parol', blk.who.password]] as const).map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100">
                    <span className="text-sm text-slate-500">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-800">{val}</span>
                      <button onClick={() => navigator.clipboard?.writeText(val)} title="Nusxalash"
                        className="text-xs text-blue-600 hover:text-blue-800">Nusxa</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <button onClick={() => {
              const c = createdCreds;
              const txt = `O'quvchi: ${c.login} / ${c.password}` + (c.parent ? `\nOta-ona: ${c.parent.login} / ${c.parent.password}` : '');
              navigator.clipboard?.writeText(txt);
            }} className="w-full mb-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Hammasini nusxalash
            </button>
            <button onClick={() => setCreatedCreds(null)}
              className="w-full bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700">
              Yopish
            </button>
          </div>
        </div>
      )}
    </>
  );
}
