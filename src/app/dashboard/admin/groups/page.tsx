'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus, X, Search, Video, ChevronUp, ChevronDown, Archive,
  UserPlus, UserMinus, QrCode, Trash2, RotateCcw, CalendarPlus, Loader2, Download,
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import Link from 'next/link';

interface Teacher { id: string; name: string; subject?: string }
interface StudentUser { id: string; name: string; login: string; rawPass?: string; status: string }
interface GroupStudent { student: StudentUser }
interface Group {
  id: string; name: string; subject: string; schedule: string;
  meetLink?: string; mode?: string; status: string; maxStudents: number;
  startDate?: string; room?: string; dayType?: string;
  time?: string; language?: string; price?: number; lessonsPerMonth?: number;
  teacher: Teacher | null;
  students: GroupStudent[];
  _count: { students: number; lessons: number };
}

const DAY_LABELS: Record<string, string> = { toq: 'Toq', juft: 'Juft', boshqa: 'Boshqa' };
const LANG_LABELS: Record<string, string> = { uz: "O'zbekcha", ru: 'Ruscha', en: 'Inglizcha' };

type SortKey = 'name' | 'students' | 'dayType' | 'teacher' | 'language' | 'room';
type SortDir = 'asc' | 'desc';

export default function GroupsPage() {
  const searchParams = useSearchParams();
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allStudents, setAllStudents] = useState<StudentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addStudentGroupId, setAddStudentGroupId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [generatingLessons, setGeneratingLessons] = useState<string | null>(null);
  const [generateMsg, setGenerateMsg] = useState<{ groupId: string; type: 'success' | 'error'; text: string } | null>(null);

  // Filters & Sort
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterLang, setFilterLang] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const emptyForm = {
    name: '', subject: '', teacherId: '', schedule: '', meetLink: '',
    maxStudents: '15', startDate: '', room: '', dayType: 'toq', time: '',
    language: 'uz', price: '', lessonsPerMonth: '12', mode: 'offline',
  };
  const [form, setForm] = useState(emptyForm);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [groupsRes, teachersResp, studentsResp] = await Promise.all([
        fetch('/api/admin/groups').then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/admin/users?role=teacher&limit=500').then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
        fetch('/api/admin/users?role=student&limit=500').then(r => r.ok ? r.json() : { data: [] }).catch(() => ({ data: [] })),
      ]);
      setGroups(Array.isArray(groupsRes) ? groupsRes : []);
      setTeachers(Array.isArray(teachersResp) ? teachersResp : (teachersResp.data || []));
      setAllStudents(Array.isArray(studentsResp) ? studentsResp : (studentsResp.data || []));
    } catch { /* handled above */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Auto-expand group from URL query ?id=xxx
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && groups.length > 0) {
      setExpandedId(id);
      // Scroll to the group row after a short delay
      setTimeout(() => {
        const el = document.getElementById(`group-row-${id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  }, [searchParams, groups]);

  const [qrGenerating, setQrGenerating] = useState<string | null>(null);

  const handleDownloadQrPdf = async (group: Group) => {
    if (group.students.length === 0) return;
    setQrGenerating(group.id);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const margin = 15;
      const colW = (pageW - margin * 2) / 2;
      const cardH = 65;
      let x = margin;
      let y = margin;
      let col = 0;

      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(group.name, pageW / 2, y + 5, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`${group.subject} | ${group.students.length} ta o'quvchi`, pageW / 2, y + 11, { align: 'center' });
      doc.setTextColor(0);
      y = margin + 18;

      for (let i = 0; i < group.students.length; i++) {
        const student = group.students[i].student;

        // New page check
        if (y + cardH > 280) {
          doc.addPage();
          y = margin;
          col = 0;
          x = margin;
        }

        // Card border
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, colW - 5, cardH - 5, 3, 3);

        // Student number + name
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}. ${student.name}`, x + 5, y + 8);

        // Login + Password info
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        doc.text(`Login: ${student.login}`, x + 5, y + 15);
        doc.text(`Parol: ${student.rawPass || '—'}`, x + 5, y + 21);
        doc.setTextColor(0);

        // QR Code — contains login and password
        const qrData = `Login: ${student.login}\nParol: ${student.rawPass || '—'}`;
        const qrDataUrl = await QRCode.toDataURL(qrData, { width: 160, margin: 1 });
        doc.addImage(qrDataUrl, 'PNG', x + colW - 50, y + 3, 38, 38);

        // CRM URL
        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.text('crm.akaukalarmarkazi.uz', x + 5, y + cardH - 10);
        doc.setTextColor(0);

        // Move to next position
        col++;
        if (col >= 2) {
          col = 0;
          x = margin;
          y += cardH;
        } else {
          x = margin + colW;
        }
      }

      doc.save(`${group.name}-QR-codes.pdf`);
    } catch (err) {
      console.error('QR PDF generation error:', err);
    } finally {
      setQrGenerating(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Xatolik yuz berdi');
      } else {
        setShowModal(false);
        setForm(emptyForm);
        fetchAll();
      }
    } catch {
      setError("Server bilan bog'lanishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePatch = async (payload: Record<string, string>) => {
    await fetch('/api/admin/groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    fetchAll();
  };

  const handleGenerateLessons = async (groupId: string, months?: number) => {
    setGeneratingLessons(groupId);
    setGenerateMsg(null);
    try {
      const res = await fetch('/api/admin/groups/generate-lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, months: months || 12 }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenerateMsg({ groupId, type: 'success', text: data.message || `${data.created} ta dars yaratildi` });
        fetchAll();
      } else {
        setGenerateMsg({ groupId, type: 'error', text: data.error || 'Xatolik yuz berdi' });
      }
    } catch {
      setGenerateMsg({ groupId, type: 'error', text: 'Server bilan bog\'lanishda xatolik' });
    } finally {
      setGeneratingLessons(null);
    }
  };

  const handleAddStudent = async (groupId: string) => {
    if (!selectedStudentId) return;
    await handlePatch({ id: groupId, addStudentId: selectedStudentId });
    setAddStudentGroupId(null);
    setSelectedStudentId('');
  };

  // Sort toggle
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-slate-600" />
      : <ChevronDown className="w-3 h-3 text-slate-600" />;
  };

  // Filter + Sort
  const filtered = useMemo(() => {
    const list = groups.filter(g => {
      if (filterStatus === 'active' && g.status !== 'active') return false;
      if (filterStatus === 'archived' && g.status !== 'archived') return false;
      if (filterLang && (g.language || 'uz') !== filterLang) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!g.name.toLowerCase().includes(s) &&
            !g.subject.toLowerCase().includes(s) &&
            !(g.teacher?.name || '').toLowerCase().includes(s) &&
            !(g.room || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'students': cmp = (a._count?.students ?? 0) - (b._count?.students ?? 0); break;
        case 'dayType': cmp = (a.dayType || '').localeCompare(b.dayType || ''); break;
        case 'teacher': cmp = (a.teacher?.name || '').localeCompare(b.teacher?.name || ''); break;
        case 'language': cmp = (a.language || '').localeCompare(b.language || ''); break;
        case 'room': cmp = (a.room || '').localeCompare(b.room || ''); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [groups, filterStatus, filterLang, search, sortKey, sortDir]);

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Guruhlar</h1>
          <div className="flex-1 flex items-center gap-3 justify-end flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Guruhni qidirish"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Yangi qo&apos;shish
            </button>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="all">Hammasi</option>
              <option value="active">Aktivlar</option>
              <option value="archived">Arxivlar</option>
            </select>
            <select
              value={filterLang}
              onChange={e => setFilterLang(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">Til</option>
              <option value="uz">O&apos;zbekcha</option>
              <option value="ru">Ruscha</option>
              <option value="en">Inglizcha</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">Guruhlar topilmadi</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3">
                      <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase hover:text-slate-700">
                        Guruh <SortIcon col="name" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3">
                      <button onClick={() => toggleSort('students')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase hover:text-slate-700 mx-auto">
                        Studentlar soni <SortIcon col="students" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3">
                      <button onClick={() => toggleSort('dayType')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase hover:text-slate-700 mx-auto">
                        Kunlar <SortIcon col="dayType" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3">
                      <button onClick={() => toggleSort('teacher')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase hover:text-slate-700">
                        Mentor <SortIcon col="teacher" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3">
                      <button onClick={() => toggleSort('language')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase hover:text-slate-700 mx-auto">
                        Til <SortIcon col="language" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Turi</th>
                    <th className="text-center px-4 py-3">
                      <button onClick={() => toggleSort('room')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase hover:text-slate-700 mx-auto">
                        Xona / Link <SortIcon col="room" />
                      </button>
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Qr code</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Chiqarilish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((group, idx) => {
                    const isExpanded = expandedId === group.id;
                    const isAddingStudent = addStudentGroupId === group.id;
                    const enrolledIds = new Set(group.students.map(gs => gs.student.id));
                    const availableStudents = allStudents.filter(s => !enrolledIds.has(s.id));

                    return (
                      <>
                        <tr key={group.id}
                          id={`group-row-${group.id}`}
                          className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`}
                          onClick={() => setExpandedId(isExpanded ? null : group.id)}
                        >
                          {/* Guruh */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-800">{idx + 1}. {group.name}</span>
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">[{group.status === 'active' ? 'New' : 'Arxiv'}] {group.subject}</span>
                              {group.teacher?.name && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded">{group.teacher.name.split(' ')[0]}</span>
                              )}
                            </div>
                            {group.time && <p className="text-[11px] text-slate-400 mt-0.5">{group.time}</p>}
                          </td>

                          {/* Studentlar soni */}
                          <td className="px-4 py-3.5 text-center">
                            <span className={`text-sm font-bold ${
                              (group._count?.students ?? 0) >= group.maxStudents ? 'text-red-500' : 'text-slate-700'
                            }`}>
                              {group._count?.students ?? 0}
                            </span>
                          </td>

                          {/* Kunlar */}
                          <td className="px-4 py-3.5 text-center">
                            <span className="text-sm text-slate-600">{DAY_LABELS[group.dayType || 'toq'] || group.dayType}</span>
                          </td>

                          {/* Mentor */}
                          <td className="px-4 py-3.5">
                            <span className="text-sm text-slate-700">{group.teacher?.name || '—'}</span>
                          </td>

                          {/* Til */}
                          <td className="px-4 py-3.5 text-center">
                            <span className="text-xs text-emerald-600 font-medium">{LANG_LABELS[group.language || 'uz'] || group.language}</span>
                          </td>

                          {/* Turi */}
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              (group.mode || 'offline') === 'online'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-blue-50 text-blue-600'
                            }`}>
                              {(group.mode || 'offline') === 'online' ? '🌐 Online' : '🏫 Offline'}
                            </span>
                          </td>

                          {/* Xona / Link */}
                          <td className="px-4 py-3.5 text-center">
                            {(group.mode || 'offline') === 'online' ? (
                              group.meetLink ? (
                                <a href={group.meetLink} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium hover:text-emerald-700"
                                  onClick={e => e.stopPropagation()}>
                                  <Video className="w-3.5 h-3.5" /> Kirish
                                </a>
                              ) : <span className="text-xs text-slate-300">—</span>
                            ) : (
                              <span className="text-sm text-slate-600">{group.room || '—'}</span>
                            )}
                          </td>

                          {/* QR */}
                          <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleDownloadQrPdf(group)}
                              disabled={qrGenerating === group.id || group.students.length === 0}
                              title={group.students.length === 0 ? "O'quvchi yo'q" : `${group.students.length} ta o'quvchi QR PDF`}
                              className={`p-1.5 rounded-lg transition-colors ${
                                group.students.length === 0
                                  ? 'text-slate-200 cursor-not-allowed'
                                  : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600'
                              }`}
                            >
                              {qrGenerating === group.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <QrCode className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Chiqarilish */}
                          <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                            {group.status === 'active' ? (
                              <button
                                onClick={() => handlePatch({ id: group.id, status: 'archived' })}
                                title="Arxivlash"
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePatch({ id: group.id, status: 'active' })}
                                title="Faollashtirish"
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-500 transition-colors"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded details */}
                        {isExpanded && (
                          <tr key={`${group.id}-expanded`}>
                            <td colSpan={9} className="bg-slate-50/50 px-0 py-0">
                              <div className="px-6 py-4 border-t border-slate-100">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                  {/* Left: Group details */}
                                  <div className="space-y-3">
                                    <h4 className="text-sm font-bold text-slate-700">Guruh ma&apos;lumotlari</h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div className="bg-white rounded-lg border border-slate-100 p-3">
                                        <p className="text-[10px] text-slate-400 uppercase mb-0.5">Oylik narx</p>
                                        <p className="font-bold text-slate-800">
                                          {group.price ? `${group.price.toLocaleString()} so'm` : 'Kiritilmagan'}
                                        </p>
                                      </div>
                                      <div className="bg-white rounded-lg border border-slate-100 p-3">
                                        <p className="text-[10px] text-slate-400 uppercase mb-0.5">Oyiga darslar</p>
                                        <p className="font-bold text-slate-800">{group.lessonsPerMonth || 12} ta</p>
                                      </div>
                                      <div className="bg-white rounded-lg border border-slate-100 p-3">
                                        <p className="text-[10px] text-slate-400 uppercase mb-0.5">1 dars narxi</p>
                                        <p className="font-bold text-orange-600">
                                          {group.price && group.lessonsPerMonth
                                            ? `${Math.round(group.price / group.lessonsPerMonth).toLocaleString()} so'm`
                                            : '—'}
                                        </p>
                                      </div>
                                      <div className="bg-white rounded-lg border border-slate-100 p-3">
                                        <p className="text-[10px] text-slate-400 uppercase mb-0.5">Boshlanish</p>
                                        <p className="font-bold text-slate-800">{group.startDate || '—'}</p>
                                      </div>
                                      {group.meetLink && (
                                        <div className="col-span-2 bg-white rounded-lg border border-slate-100 p-3">
                                          <p className="text-[10px] text-slate-400 uppercase mb-0.5">Google Meet</p>
                                          <a href={group.meetLink} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-emerald-600 font-medium hover:text-emerald-700">
                                            <Video className="w-3.5 h-3.5" /> Darsga kirish
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Students list + Lessons */}
                                  <div className="space-y-4">
                                    {/* Darslarni generatsiya qilish */}
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-700 mb-2">Darslar jadvali</h4>
                                      <div className="bg-white rounded-lg border border-slate-100 p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="text-sm text-slate-600">
                                            <span className="font-medium">{group._count?.lessons ?? 0}</span> ta dars mavjud
                                            {group.dayType && (
                                              <span className="ml-2 text-xs text-slate-400">
                                                ({group.dayType === 'toq' ? 'Dush/Chor/Jum' : group.dayType === 'juft' ? 'Sesh/Pay/Shan' : group.dayType})
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleGenerateLessons(group.id, 1)}
                                            disabled={generatingLessons === group.id}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                          >
                                            {generatingLessons === group.id ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <CalendarPlus className="w-3.5 h-3.5" />
                                            )}
                                            +1 oy
                                          </button>
                                          <button
                                            onClick={() => handleGenerateLessons(group.id, 3)}
                                            disabled={generatingLessons === group.id}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                          >
                                            {generatingLessons === group.id ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <CalendarPlus className="w-3.5 h-3.5" />
                                            )}
                                            +3 oy
                                          </button>
                                          <button
                                            onClick={() => handleGenerateLessons(group.id, 12)}
                                            disabled={generatingLessons === group.id}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                                          >
                                            {generatingLessons === group.id ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <CalendarPlus className="w-3.5 h-3.5" />
                                            )}
                                            +12 oy
                                          </button>
                                        </div>
                                        {generateMsg && generateMsg.groupId === group.id && (
                                          <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${
                                            generateMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                          }`}>
                                            {generateMsg.text}
                                          </div>
                                        )}
                                        {!group.startDate && (
                                          <p className="mt-2 text-[11px] text-amber-600">
                                            Boshlanish sanasi kiritilmagan. Bugungi kundan boshlab generatsiya qilinadi.
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Students list */}
                                    <div>
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-sm font-bold text-slate-700">
                                        O&apos;quvchilar ({group.students.length}/{group.maxStudents})
                                      </h4>
                                      {group.status !== 'archived' && (
                                        <button
                                          onClick={() => {
                                            setAddStudentGroupId(isAddingStudent ? null : group.id);
                                            setSelectedStudentId('');
                                          }}
                                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                                        >
                                          <UserPlus className="w-3.5 h-3.5" />
                                          Qo&apos;shish
                                        </button>
                                      )}
                                    </div>

                                    {isAddingStudent && (
                                      <div className="flex items-center gap-2 mb-3 p-3 bg-blue-50 rounded-lg">
                                        <select
                                          value={selectedStudentId}
                                          onChange={e => setSelectedStudentId(e.target.value)}
                                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                                        >
                                          <option value="">O&apos;quvchini tanlang</option>
                                          {availableStudents.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                          ))}
                                        </select>
                                        <button onClick={() => handleAddStudent(group.id)} disabled={!selectedStudentId}
                                          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                                          Qo&apos;sh
                                        </button>
                                      </div>
                                    )}

                                    {group.students.length === 0 ? (
                                      <p className="text-sm text-slate-400 text-center py-4 bg-white rounded-lg border border-slate-100">O&apos;quvchi yo&apos;q</p>
                                    ) : (
                                      <div className="bg-white rounded-lg border border-slate-100 divide-y divide-slate-50 max-h-60 overflow-y-auto">
                                        {group.students.map((gs, sIdx) => (
                                          <div key={gs.student.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50/50">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-slate-400 w-5">{sIdx + 1}.</span>
                                              <Link href={`/dashboard/admin/students/${gs.student.id}`}
                                                className="text-sm text-slate-800 hover:text-blue-600 font-medium">
                                                {gs.student.name}
                                              </Link>
                                              {gs.student.status !== 'active' && (
                                                <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                                                  gs.student.status === 'frozen' ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                  {gs.student.status === 'frozen' ? 'Muzlatilgan' : 'Arxiv'}
                                                </span>
                                              )}
                                            </div>
                                            {group.status !== 'archived' && (
                                              <button onClick={() => handlePatch({ id: group.id, removeStudentId: gs.student.id })}
                                                className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                                                <UserMinus className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-400">Jami: {filtered.length} ta guruh</span>
              <span className="text-xs text-slate-400">
                Studentlar: {filtered.reduce((s, g) => s + (g._count?.students ?? 0), 0)} ta
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Create Modal (Mars IT style) ═══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Yangi qo&apos;shish</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-5">
              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

              {/* Online / Offline toggle */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  <span className="text-red-500">*</span> Ta&apos;lim turi
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm(p => ({ ...p, mode: 'offline' }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      form.mode === 'offline'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}>
                    🏫 Offline
                  </button>
                  <button type="button" onClick={() => setForm(p => ({ ...p, mode: 'online' }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      form.mode === 'online'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}>
                    🌐 Online
                  </button>
                </div>
              </div>

              {/* Kursni tanlang */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1.5">
                  <span className="text-red-500">*</span> Kursni tanlang
                </label>
                <select required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                  <option value="">Kursni tanlang</option>
                  {["Matematika", "Fizika", "Kimyo", "Biologiya", "Dasturlash", "Tarix", "Geografiya", "Ona tili va adabiyot", "Ingliz tili", "Rus tili", "Turk tili", "SAT", "IT (Axborot texnologiyalari)"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Guruh nomi */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1.5">
                  <span className="text-red-500">*</span> Guruh nomi
                </label>
                <input type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="nF-2496" />
              </div>

              {/* Mentor */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1.5">
                  <span className="text-red-500">*</span> Mentor
                </label>
                <select value={form.teacherId} onChange={e => setForm(p => ({ ...p, teacherId: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                  <option value="">Mentor</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}{t.subject ? ` — ${t.subject}` : ''}</option>)}
                </select>
              </div>

              {/* Kunlar — toggle buttons */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2">
                  <span className="text-red-500">*</span> Kunlar
                </label>
                <div className="flex gap-2 mb-2">
                  {[
                    { value: 'toq', label: 'Toq kunlar' },
                    { value: 'juft', label: 'Juft kunlar' },
                    { value: 'boshqa', label: 'Boshqa' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, dayType: opt.value }))}
                      className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        form.dayType === opt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Shanba
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Yakshanba
                  </label>
                </div>
              </div>

              {/* Auditoriya (offline) / Meet Link (online) */}
              {form.mode === 'offline' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1.5">
                    <span className="text-red-500">*</span> Auditoriya
                  </label>
                  <input type="text" value={form.room} onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    placeholder="Room 8" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <span className="text-red-500">*</span>
                    <Video className="w-4 h-4 text-emerald-500" />
                    Dars linki
                  </label>
                  <input type="url" value={form.meetLink} onChange={e => setForm(p => ({ ...p, meetLink: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="https://meet.google.com/abc-defg-hij" />
                </div>
              )}

              {/* Til */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1.5">
                  <span className="text-red-500">*</span> Til
                </label>
                <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                  <option value="uz">O&apos;zbekcha</option>
                  <option value="ru">Ruscha</option>
                  <option value="en">Inglizcha</option>
                </select>
              </div>

              {/* Boshlanish vaqti + sana */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1.5">
                    <span className="text-red-500">*</span> Boshlanish vaqti
                  </label>
                  <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1.5">
                    <span className="text-red-500">*</span> Boshlanish sana
                  </label>
                  <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
              </div>

              {/* Oylik narx + Darslar soni */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1.5">Oylik narx (so&apos;m)</label>
                  <input type="number" min="0" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    placeholder="500 000"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1.5">Oyiga darslar</label>
                  <input type="number" min="1" value={form.lessonsPerMonth} onChange={e => setForm(p => ({ ...p, lessonsPerMonth: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </div>
              </div>

              {/* Max studentlar */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1.5">Max o&apos;quvchilar</label>
                <input type="number" min="1" value={form.maxStudents} onChange={e => setForm(p => ({ ...p, maxStudents: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  Bekor qilish
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-orange-500 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-60 transition-colors">
                  {submitting ? 'Yaratilmoqda...' : 'Yaratish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
