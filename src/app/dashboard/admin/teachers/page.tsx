'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminNav } from '@/lib/nav';
import { Search, Plus, X, LayoutGrid, List, Users, FolderOpen, Phone, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TeacherGroup {
  id: string;
  name: string;
  _count?: { students: number };
}

interface Teacher {
  id: string;
  name: string;
  login: string;
  phone: string;
  status: string;
  subject?: string;
  level?: string;
  avatar?: string;
  teacherGroups: TeacherGroup[];
}

const LEVEL_COLORS: Record<string, string> = {
  senior: 'bg-emerald-100 text-emerald-700',
  middle: 'bg-amber-100 text-amber-700',
  junior: 'bg-blue-100 text-blue-700',
};

export default function TeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterTab, setFilterTab] = useState('all');
  const [formData, setFormData] = useState({
    name: '', login: '', password: '', phone: '', subject: '', level: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchTeachers = () => {
    setLoading(true);
    fetch('/api/admin/users?role=teacher')
      .then(res => res.json())
      .then(data => {
        setTeachers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchTeachers(); }, []);

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: 'teacher' }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Xatolik yuz berdi');
      } else {
        setShowModal(false);
        setFormData({ name: '', login: '', password: '', phone: '', subject: '', level: '' });
        fetchTeachers();
      }
    } catch {
      setError("Server bilan bog'lanishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const activeTeachers = teachers.filter(t => t.status === 'active');
  const withGroups = activeTeachers.filter(t => t.teacherGroups?.length > 0);
  const withoutGroups = activeTeachers.filter(t => !t.teacherGroups?.length);

  const filtered = (() => {
    let list = teachers;
    if (filterTab === 'with_groups') list = withGroups;
    else if (filterTab === 'without_groups') list = withoutGroups;
    if (search) {
      list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
    }
    return list;
  })();

  const totalStudents = (t: Teacher) =>
    (t.teacherGroups || []).reduce((sum, g) => sum + (g._count?.students || 0), 0);

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <DashboardLayout navItems={adminNav} roleLabel="Admin" roleColor="bg-red-100 text-red-700">
      <div className="space-y-5">
        {/* Header with count, search, filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="text-lg font-bold text-slate-900">
            <span className="text-2xl">{activeTeachers.length}</span>{' '}
            <span className="text-slate-500 font-normal">mentorlar</span>
          </p>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Mentorni qidirish"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              Barcha
            </button>
            <button onClick={() => setFilterTab('with_groups')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterTab === 'with_groups' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              Guruhli
            </button>
            <button onClick={() => setFilterTab('without_groups')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${filterTab === 'without_groups' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              Guruhsiz <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">{withoutGroups.length}</span>
            </button>
          </div>

          {/* View toggle + Add button */}
          <div className="flex items-center gap-2">
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
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">Mentorlar topilmadi</div>
        ) : viewMode === 'grid' ? (
          /* Grid view — Mars IT cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(teacher => (
              <div key={teacher.id} onClick={() => router.push(`/dashboard/admin/teachers/${teacher.id}`)} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-start gap-3 mb-3">
                  {/* Avatar */}
                  <div className="w-14 h-14 bg-gradient-to-br from-[#2660A4] to-[#22AA79] rounded-2xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg font-bold">{initials(teacher.name)}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{teacher.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {teacher.phone || '—'}
                    </div>
                  </div>
                  {teacher.status === 'active' && (
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 ml-auto" />
                  )}
                </div>

                {/* Level + subjects */}
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {teacher.level && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${LEVEL_COLORS[teacher.level] || 'bg-slate-100 text-slate-600'}`}>
                      {teacher.level}
                    </span>
                  )}
                  {teacher.subject && teacher.subject.split(',').map((s, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                      {s.trim()}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-slate-500 border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span className="font-semibold text-slate-700">{teacher.teacherGroups?.length || 0}</span> Guruhlar
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span className="font-semibold text-slate-700">{totalStudents(teacher)}</span> O&apos;quvchilar
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List view — table */
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Mentor</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Telefon</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Daraja</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Yo&apos;nalish</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Guruhlar</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">O&apos;quvchilar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(teacher => (
                    <tr key={teacher.id} onClick={() => router.push(`/dashboard/admin/teachers/${teacher.id}`)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-[#2660A4] to-[#22AA79] rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{initials(teacher.name)}</span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{teacher.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{teacher.phone || '—'}</td>
                      <td className="px-5 py-3">
                        {teacher.level ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${LEVEL_COLORS[teacher.level] || 'bg-slate-100 text-slate-600'}`}>
                            {teacher.level}
                          </span>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{teacher.subject || '—'}</td>
                      <td className="px-5 py-3 text-center text-sm font-semibold text-slate-700">{teacher.teacherGroups?.length || 0}</td>
                      <td className="px-5 py-3 text-center text-sm font-semibold text-slate-700">{totalStudents(teacher)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Yangi mentor qo&apos;shish</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAddTeacher} className="space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ism familiya *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Suyunov Ilyos" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Login *</label>
                  <input type="text" required value={formData.login} onChange={e => setFormData(p => ({ ...p, login: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    placeholder="ilyos01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parol *</label>
                  <input type="password" required value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                <input type="text" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="+998 33 319 64 55" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Yo&apos;nalish</label>
                  <input type="text" value={formData.subject} onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    placeholder="Frontend, Backend" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Daraja</label>
                  <select value={formData.level} onChange={e => setFormData(p => ({ ...p, level: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    <option value="">Tanlang</option>
                    <option value="senior">Senior</option>
                    <option value="middle">Middle</option>
                    <option value="junior">Junior</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Bekor qilish
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
                  {submitting ? 'Saqlanmoqda...' : "Qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
