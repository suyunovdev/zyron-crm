'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, Loader2, Users, FolderOpen,
  Calendar, Clock, MapPin, LayoutGrid, List,
  Pencil, KeyRound, Eye, EyeOff, Copy, X, Check,
} from 'lucide-react';
import { toast } from '@/components/toast';
import { SkeletonDetailPage } from '@/components/skeleton';

interface GroupStudent {
  student: { id: string; name: string; status: string };
}
interface Group {
  id: string; name: string; subject: string; status: string;
  schedule: string; dayType: string; time: string; room: string;
  startDate: string; mode: string;
  students: GroupStudent[];
  _count: { students: number; lessons: number };
}
interface TeacherDetail {
  id: string; login: string; rawPass: string | null; name: string; phone: string;
  role: string; subject: string | null; status: string;
  level: string | null; createdAt: string;
  teacherGroups: Group[];
}

const LEVEL_COLORS: Record<string, { label: string; cls: string }> = {
  senior: { label: 'Senior', cls: 'text-emerald-600' },
  middle: { label: 'Middle', cls: 'text-amber-600' },
  junior: { label: 'Junior', cls: 'text-blue-600' },
};

const DAY_LABELS: Record<string, string> = { toq: 'Toq', juft: 'Juft', boshqa: 'Boshqa' };

const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

export default function TeacherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id as string;

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('groups');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [revealPass, setRevealPass] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', subject: '', level: '', password: '' });

  const fetchTeacher = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/users/${teacherId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setTeacher(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [teacherId]);

  useEffect(() => { fetchTeacher(); }, [fetchTeacher]);

  const openEdit = () => {
    if (!teacher) return;
    setEditForm({
      name: teacher.name, phone: teacher.phone || '',
      subject: teacher.subject || '', level: teacher.level || '', password: '',
    });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { toast.error('Ism kiritilishi shart'); return; }
    setSaving(true);
    try {
      const body: Record<string, string> = {
        id: teacherId, name: editForm.name.trim(), phone: editForm.phone.trim(),
        subject: editForm.subject.trim(), level: editForm.level,
      };
      if (editForm.password.trim()) body.password = editForm.password.trim();
      const r = await fetch('/api/admin/users', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'Xatolik'); return; }
      setShowEdit(false);
      fetchTeacher();
      toast.success('Ustoz ma\'lumotlari saqlandi');
    } finally { setSaving(false); }
  };

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const activeGroups = useMemo(() => {
    if (!teacher) return [];
    return teacher.teacherGroups.filter(g => g.status === 'active');
  }, [teacher]);

  const archivedGroups = useMemo(() => {
    if (!teacher) return [];
    return teacher.teacherGroups.filter(g => g.status !== 'active');
  }, [teacher]);

  const totalStudents = useMemo(() => {
    return activeGroups.reduce((sum, g) => sum + g._count.students, 0);
  }, [activeGroups]);

  const joinDate = useMemo(() => {
    if (!teacher) return '';
    const d = new Date(teacher.createdAt);
    return `${d.getFullYear()}-yildan beri`;
  }, [teacher]);

  const fmtDate = (d: string) => {
    if (!d) return '—';
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  };

  if (loading) {
    return <SkeletonDetailPage />;
  }

  if (!teacher) {
    return (
      <>
        <div className="text-center py-20 text-slate-400">
          <p>Mentor topilmadi</p>
          <button onClick={() => router.push('/dashboard/admin/teachers')} className="text-blue-600 text-sm mt-2">Orqaga qaytish</button>
        </div>
      </>
    );
  }

  const level = teacher.level ? LEVEL_COLORS[teacher.level] : null;

  return (
    <>
      {/* Back */}
      <div className="mb-4">
        <button onClick={() => router.push('/dashboard/admin/teachers')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Mentorlar
        </button>
      </div>

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gradient-to-br from-[var(--brand-primary)] to-[#22AA79] rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl font-bold">
                {teacher.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{teacher.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {level && (
                  <span className={`text-sm font-bold ${level.cls}`}>{level.label}</span>
                )}
                {teacher.subject && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-sm text-slate-500">{teacher.subject}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                {teacher.phone && (
                  <a href={`tel:${teacher.phone}`} className="flex items-center gap-1 hover:text-emerald-600">
                    <Phone className="w-3 h-3" /> {teacher.phone}
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {joinDate}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{currentMonth}</span>
            </span>
            <button onClick={openEdit}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              <Pencil className="w-4 h-4" /> Tahrirlash
            </button>
          </div>
        </div>

        {/* ── Kirish ma'lumotlari (login / parol) ── */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
            <span className="text-sm text-slate-500 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Login</span>
            <span className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-slate-800">{teacher.login}</span>
              <button onClick={() => { navigator.clipboard?.writeText(teacher.login); toast.success('Login nusxalandi'); }}
                title="Nusxalash" className="text-slate-400 hover:text-blue-600"><Copy className="w-3.5 h-3.5" /></button>
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
            <span className="text-sm text-slate-500 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Parol</span>
            <span className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-slate-800">{revealPass ? (teacher.rawPass || '—') : '••••••'}</span>
              <button onClick={() => setRevealPass(v => !v)} title={revealPass ? 'Yashirish' : 'Ko\'rsatish'}
                className="text-slate-400 hover:text-blue-600">{revealPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
              {teacher.rawPass && (
                <button onClick={() => { navigator.clipboard?.writeText(teacher.rawPass!); toast.success('Parol nusxalandi'); }}
                  title="Nusxalash" className="text-slate-400 hover:text-blue-600"><Copy className="w-3.5 h-3.5" /></button>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">Guruhlar soni</p>
          <p className="text-2xl font-bold text-slate-900">{activeGroups.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">O&apos;quvchi soni</p>
          <p className="text-2xl font-bold text-slate-900">{totalStudents}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">O&apos;ttok soni</p>
          <p className="text-2xl font-bold text-slate-900">{archivedGroups.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 mb-1">Reyting · {currentMonth}</p>
          <p className="text-2xl font-bold text-slate-900">—<span className="text-sm text-slate-400 font-normal">/100</span></p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('groups')}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'groups' ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            Guruhlar ({activeGroups.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'history' ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            Guruhlar tarixi ({archivedGroups.length})
          </button>
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Groups content ── */}
      {activeTab === 'groups' && (
        activeGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Aktiv guruhlar yo&apos;q</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGroups.map((g, idx) => (
              <div key={g.id} onClick={() => router.push(`/dashboard/admin/groups/${g.id}`)}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-[var(--brand-primary)]/40 transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{idx + 1}.{g.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {DAY_LABELS[g.dayType] || g.dayType} · {g.time || '—'} · {g.subject}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded">Aktiv</span>
                </div>
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{g._count.students}</span> o&apos;quvchi · guruhda
                  <span className="font-semibold text-slate-700">{g._count.lessons}</span> oy
                </p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                  {g.room && (
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded font-medium uppercase">{g.room}</span>
                  )}
                  {g.startDate && (
                    <span>{fmtDate(g.startDate)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
           <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Guruh</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Kurs</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Vaqt</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">O&apos;quvchilar</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeGroups.map((g, idx) => (
                  <tr key={g.id} onClick={() => router.push(`/dashboard/admin/groups/${g.id}`)}
                    className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-5 py-3 text-sm text-slate-500">{idx + 1}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-900">{g.name}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{g.subject}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {DAY_LABELS[g.dayType] || g.dayType} · {g.time || '—'}
                    </td>
                    <td className="px-5 py-3 text-center text-sm font-semibold text-slate-700">{g._count.students}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded">Aktiv</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
           </div>
          </div>
        )
      )}

      {activeTab === 'history' && (
        archivedGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Guruhlar tarixi bo&apos;sh</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedGroups.map((g, idx) => (
              <div key={g.id} onClick={() => router.push(`/dashboard/admin/groups/${g.id}`)}
                className="bg-white rounded-xl border border-slate-200 p-4 opacity-70 hover:opacity-100 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-700">{idx + 1}.{g.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {DAY_LABELS[g.dayType] || g.dayType} · {g.time || '—'} · {g.subject}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">Arxiv</span>
                </div>
                <p className="text-xs text-slate-400">
                  {g._count.students} o&apos;quvchi
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Tahrirlash modali ── */}
      {showEdit && (
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowEdit(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Ustozni tahrirlash</h3>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ism</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Telefon</label>
                  <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Daraja</label>
                  <select value={editForm.level} onChange={e => setEditForm(f => ({ ...f, level: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20">
                    <option value="">—</option>
                    <option value="junior">Junior</option>
                    <option value="middle">Middle</option>
                    <option value="senior">Senior</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Fan / Yo&apos;nalish</label>
                <input value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Yangi parol (ixtiyoriy)</label>
                <input value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="O'zgartirmaslik uchun bo'sh qoldiring"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20" />
              </div>
            </div>
            <div className="flex gap-2 justify-end px-5 py-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setShowEdit(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Bekor</button>
              <button onClick={saveEdit} disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f4f88] disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
