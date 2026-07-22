'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Link2, Unlink, Search, Users } from 'lucide-react';

interface ChildInfo {
  id: string; name: string; login: string; phone: string | null; status: string;
}

interface Parent {
  id: string; login: string; name: string; phone: string | null;
  status: string; createdAt: string; children: ChildInfo[];
}

interface StudentOption {
  id: string; name: string; login: string; phone: string | null;
}

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [linkModal, setLinkModal] = useState<Parent | null>(null);

  // Create form
  const [form, setForm] = useState({ name: '', login: '', password: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Link form
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchParents = () => {
    setLoading(true);
    fetch('/api/admin/parents')
      .then(r => r.ok ? r.json() : [])
      .then(d => { setParents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchParents(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Xatolik');
      } else {
        setShowModal(false);
        setForm({ name: '', login: '', password: '', phone: '' });
        fetchParents();
      }
    } catch {
      setError("Server bilan bog'lanishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const openLinkModal = (parent: Parent) => {
    setLinkModal(parent);
    setStudentSearch('');
    setLoadingStudents(true);
    // Fetch unlinked students (no parent)
    fetch('/api/admin/users?role=student&limit=500')
      .then(r => r.ok ? r.json() : { data: [] })
      .then(resp => {
        const all = Array.isArray(resp) ? resp : (resp.data || []);
        setStudents(all.map((s: { id: string; name: string; login: string; phone: string | null }) => ({
          id: s.id, name: s.name, login: s.login, phone: s.phone,
        })));
        setLoadingStudents(false);
      })
      .catch(() => setLoadingStudents(false));
  };

  const handleLink = async (studentId: string) => {
    if (!linkModal) return;
    await fetch('/api/admin/parents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId: linkModal.id, studentId, action: 'link' }),
    });
    fetchParents();
    // Refresh link modal data
    setLinkModal(prev => {
      if (!prev) return null;
      const student = students.find(s => s.id === studentId);
      if (student) {
        return { ...prev, children: [...prev.children, { ...student, status: 'active' }] };
      }
      return prev;
    });
  };

  const handleUnlink = async (parentId: string, studentId: string) => {
    await fetch('/api/admin/parents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId, studentId, action: 'unlink' }),
    });
    fetchParents();
    setLinkModal(prev => {
      if (!prev) return null;
      return { ...prev, children: prev.children.filter(c => c.id !== studentId) };
    });
  };

  const filteredStudents = students.filter(s => {
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.login.toLowerCase().includes(q);
  });

  // Filter out already linked children
  const linkedIds = linkModal?.children.map(c => c.id) || [];
  const availableStudents = filteredStudents.filter(s => !linkedIds.includes(s.id));

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ota-onalar</h1>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yangi qo&apos;shish
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-slate-400 text-sm">Yuklanmoqda...</div>
          ) : parents.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm">Ota-onalar topilmadi</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-5 py-3.5 text-sm font-medium text-slate-500">#</th>
                    <th className="text-left px-5 py-3.5 text-sm font-medium text-slate-500">Ism</th>
                    <th className="text-left px-5 py-3.5 text-sm font-medium text-slate-500">Login</th>
                    <th className="text-left px-5 py-3.5 text-sm font-medium text-slate-500">Telefon</th>
                    <th className="text-left px-5 py-3.5 text-sm font-medium text-slate-500">Farzandlar</th>
                    <th className="text-center px-5 py-3.5 text-sm font-medium text-slate-500">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {parents.map((p, i) => (
                    <tr key={p.id} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="px-5 py-3 text-sm text-slate-400">{i + 1}</td>
                      <td className="px-5 py-3 text-sm font-medium text-slate-800 dark:text-white">{p.name}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{p.login}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{p.phone || '—'}</td>
                      <td className="px-5 py-3">
                        {p.children.length === 0 ? (
                          <span className="text-xs text-slate-400">Bog&apos;lanmagan</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {p.children.map(c => (
                              <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                {c.name}
                                <button
                                  onClick={() => handleUnlink(p.id, c.id)}
                                  className="hover:text-red-500 transition-colors"
                                  title="Bog'lanishni uzish"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => openLinkModal(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          Farzand bog&apos;lash
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && parents.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-400">Jami: {parents.length} ta ota-ona</span>
            </div>
          )}
        </div>
      </div>

      {/* Create Parent Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Yangi ota-ona qo&apos;shish</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ism familiya *</label>
                <input type="text" required value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Abdullayev Karim" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Login *</label>
                  <input type="text" required value={form.login}
                    onChange={e => setForm(p => ({ ...p, login: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="karim_ota" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parol *</label>
                  <input type="password" required value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="********" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                <input type="text" value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="+998 90 123 45 67" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  Bekor qilish
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">
                  {submitting ? 'Saqlanmoqda...' : "Qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Children Modal */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLinkModal(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {linkModal.name} — Farzand bog&apos;lash
              </h2>
              <button onClick={() => setLinkModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Current children */}
            {linkModal.children.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-slate-500 mb-2">Bog&apos;langan farzandlar:</p>
                <div className="flex flex-wrap gap-2">
                  {linkModal.children.map(c => (
                    <span key={c.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                      <Users className="w-3.5 h-3.5" />
                      {c.name}
                      <button onClick={() => handleUnlink(linkModal.id, c.id)}
                        className="ml-1 hover:text-red-500" title="Uzish">
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Search students */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="O'quvchini qidirish..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>

            {/* Student list */}
            <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg divide-y divide-slate-100 dark:divide-slate-700">
              {loadingStudents ? (
                <div className="p-4 text-center text-sm text-slate-400">Yuklanmoqda...</div>
              ) : availableStudents.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">O&apos;quvchi topilmadi</div>
              ) : (
                availableStudents.slice(0, 50).map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{s.name}</p>
                      <p className="text-xs text-slate-400">{s.login}</p>
                    </div>
                    <button onClick={() => handleLink(s.id)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 transition-colors">
                      <Link2 className="w-3.5 h-3.5 inline mr-1" />
                      Bog&apos;lash
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
