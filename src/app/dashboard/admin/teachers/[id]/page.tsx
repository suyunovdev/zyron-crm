'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, Loader2, Users, FolderOpen,
  Calendar, Clock, MapPin, LayoutGrid, List,
} from 'lucide-react';

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
  id: string; login: string; name: string; phone: string;
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

  const fetchTeacher = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/users/${teacherId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setTeacher(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [teacherId]);

  useEffect(() => { fetchTeacher(); }, [fetchTeacher]);

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
    return (
      <>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </>
    );
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
            <div className="w-16 h-16 bg-gradient-to-br from-[#2660A4] to-[#22AA79] rounded-2xl flex items-center justify-center flex-shrink-0">
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

          {/* Month selector */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">{currentMonth}</span>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-4 gap-4 mb-5">
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
              activeTab === 'groups' ? 'border-[#2660A4] text-[#2660A4]' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            Guruhlar ({activeGroups.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'history' ? 'border-[#2660A4] text-[#2660A4]' : 'border-transparent text-slate-400 hover:text-slate-600'
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
              <div key={g.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
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
            <table className="w-full">
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
                  <tr key={g.id} className="hover:bg-slate-50">
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
              <div key={g.id} className="bg-white rounded-xl border border-slate-200 p-4 opacity-70">
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
    </>
  );
}
