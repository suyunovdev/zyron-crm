'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Users, BookOpen, CalendarDays, Clock,
  UserCheck, UserX, Check, Video, Loader2, MapPin, X, CalendarPlus, Search, Plus, GraduationCap,
  Pencil, Trash2,
} from 'lucide-react';
import { toast } from '@/components/toast';

interface Student {
  id: string;
  name: string;
  phone: string;
  status: string;
}

interface Attendance {
  id: string;
  studentId: string;
  present: boolean;
}

interface Lesson {
  id: string;
  topic: string | null;
  scheduledDate: string;
  scheduledTime: string;
  duration: string;
  order: number;
  attendances: Attendance[];
}

interface GroupDetail {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  status: string;
  mode: string;
  room: string;
  dayType: string;
  time: string;
  startDate: string;
  meetLink?: string;
  teacher: { id: string; name: string } | null;
  students: { student: Student }[];
  lessons: Lesson[];
  _count: { students: number; lessons: number };
}

const DAY_LABELS: Record<string, string> = { toq: 'Toq (Dush/Chor/Jum)', juft: 'Juft (Sesh/Pay/Shan)', boshqa: 'Boshqa' };

const MONTHS_SHORT: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

function isSameDay(dateStr: string): boolean {
  const today = new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return today.getFullYear() === y && today.getMonth() + 1 === m && today.getDate() === d;
}

type TabType = 'davomat' | 'mavzular' | 'oquvchilar';

export default function AdminGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('davomat');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [allStudents, setAllStudents] = useState<{ id: string; name: string; phone?: string; status: string }[]>([]);
  const [allTeachers, setAllTeachers] = useState<{ id: string; name: string; subject?: string }[]>([]);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [untilDate, setUntilDate] = useState('');
  const [busy, setBusy] = useState(false);
  // Dars jadvalini tahrirlash
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ scheduledDate: '', scheduledTime: '', topic: '' });
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ scheduledDate: '', scheduledTime: '', topic: '' });

  const now = new Date();

  const reload = useCallback(() =>
    fetch(`/api/admin/groups/${groupId}`).then(r => r.ok ? r.json() : null).then(d => setGroup(d)),
  [groupId]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/groups/${groupId}`).then(r => r.ok ? r.json() : null),
      fetch('/api/admin/users?role=student&limit=500').then(r => r.ok ? r.json() : { data: [] }),
      fetch('/api/admin/users?role=teacher&limit=500').then(r => r.ok ? r.json() : { data: [] }),
    ]).then(([g, s, tch]) => {
      setGroup(g);
      setAllStudents(Array.isArray(s?.data) ? s.data : []);
      setAllTeachers(Array.isArray(tch?.data) ? tch.data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [groupId]);

  // Mentor (o'qituvchi) tayinlash/o'zgartirish
  const changeMentor = async (teacherId: string) => {
    if (!teacherId) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/groups', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: groupId, teacherId }),
      });
      if (!r.ok) { toast.error((await r.json()).error || 'Xatolik'); return; }
      await reload();
    } finally { setBusy(false); }
  };

  // Dars generatsiya — sanadan sanagacha
  const generateUntil = async () => {
    if (!untilDate) return;
    if (fromDate && fromDate > untilDate) { toast.error('Boshlanish sanasi tugash sanasidan keyin bo\'lmasligi kerak'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/admin/groups/generate-lessons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, endDate: untilDate, ...(fromDate ? { startDate: fromDate } : {}) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'Xatolik'); return; }
      const jumpMonth = (fromDate || untilDate).slice(0, 7);
      setFromDate('');
      setUntilDate('');
      await reload();
      if (typeof d.created === 'number' && d.created > 0) {
        // Yaratilgan oraliqni ko'rsatish uchun o'sha oyga o'tamiz
        setSelectedMonth(jumpMonth);
        setActiveTab('davomat');
        toast.success(`${d.created} ta dars qo'shildi`);
      } else {
        toast.info('Yangi dars topilmadi (tanlangan oraliqdagi barcha darslar allaqachon mavjud)');
      }
    } finally { setBusy(false); }
  };
  // O'quvchi qo'shish (qidiruv natijasidan)
  const addStudent = async (sid: string) => {
    if (!sid) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/groups', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: groupId, addStudentId: sid }),
      });
      if (!r.ok) { toast.error((await r.json()).error || 'Xatolik'); return; }
      setSearch('');
      await reload();
    } finally { setBusy(false); }
  };
  // O'quvchini chiqarish
  const removeStudent = async (sid: string) => {
    if (!confirm("O'quvchini guruhdan chiqarasizmi?")) return;
    setBusy(true);
    try {
      await fetch('/api/admin/groups', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: groupId, removeStudentId: sid }),
      });
      await reload();
    } finally { setBusy(false); }
  };

  // Darsni tahrirlashni boshlash
  const startEdit = (l: Lesson) => {
    setAddOpen(false);
    setEditId(l.id);
    setEditForm({ scheduledDate: l.scheduledDate, scheduledTime: l.scheduledTime || '', topic: l.topic || '' });
  };
  // Dars tahririni saqlash (sana / vaqt / mavzu)
  const saveLesson = async () => {
    if (!editId || !editForm.scheduledDate) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/lessons', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, ...editForm }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'Xatolik'); return; }
      setEditId(null);
      await reload();
    } finally { setBusy(false); }
  };
  // Darsni o'chirish (davomat yozuvlari ham o'chadi)
  const deleteLesson = async (l: Lesson) => {
    const hasAtt = l.attendances.length > 0;
    if (!confirm(hasAtt
      ? `Bu darsni o'chirasizmi? ${l.attendances.length} ta davomat yozuvi ham o'chadi.`
      : "Bu darsni o'chirasizmi?")) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/lessons', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: l.id }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'Xatolik'); return; }
      await reload();
    } finally { setBusy(false); }
  };
  // Yangi alohida dars qo'shish
  const addLesson = async () => {
    if (!addForm.scheduledDate) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/lessons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, ...addForm }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'Xatolik'); return; }
      setAddForm({ scheduledDate: '', scheduledTime: '', topic: '' });
      setAddOpen(false);
      await reload();
    } finally { setBusy(false); }
  };

  const availableMonths = useMemo(() => {
    if (!group) return [];
    const monthSet = new Set<string>();
    group.lessons.forEach(l => {
      const [y, m] = l.scheduledDate.split('-');
      monthSet.add(`${y}-${m}`);
    });
    return Array.from(monthSet).sort();
  }, [group]);

  useEffect(() => {
    if (availableMonths.length === 0) { setSelectedMonth(''); return; }
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    // Reload'dan keyin joriy tanlangan oy hali mavjud bo'lsa — uni saqlaymiz
    // (aks holda dars yaratganda ko'rinish joriy oyga qaytib ketardi).
    setSelectedMonth(prev =>
      prev && availableMonths.includes(prev)
        ? prev
        : (availableMonths.includes(cur) ? cur : availableMonths[availableMonths.length - 1])
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id, availableMonths.length]);

  const filteredLessons = useMemo(() => {
    if (!group || !selectedMonth) return [];
    return group.lessons
      .filter(l => { const [y, m] = l.scheduledDate.split('-'); return `${y}-${m}` === selectedMonth; })
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.order - b.order);
  }, [group, selectedMonth]);

  const dateRange = useMemo(() => {
    if (!group || group.lessons.length === 0) return null;
    const sorted = [...group.lessons].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    const fmt = (d: string) => { const [y, m, day] = d.split('-'); return `${day}.${m}.${y}`; };
    return `${fmt(sorted[0].scheduledDate)} – ${fmt(sorted[sorted.length - 1].scheduledDate)}`;
  }, [group]);

  // Toggle attendance: empty -> present -> absent -> empty
  const toggleAttendance = useCallback(async (lessonId: string, studentId: string, currentRecord: Attendance | undefined) => {
    if (!group) return;
    const cellKey = `${lessonId}-${studentId}`;
    if (savingCells.has(cellKey)) return;

    setSavingCells(prev => new Set(prev).add(cellKey));

    try {
      if (!currentRecord) {
        // empty -> present
        const res = await fetch('/api/admin/attendance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, studentId, present: true }),
        });
        if (!res.ok) throw new Error();
        const att = await res.json();
        setGroup(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            lessons: prev.lessons.map(l =>
              l.id === lessonId
                ? { ...l, attendances: [...l.attendances, { id: att.id, studentId, present: true }] }
                : l
            ),
          };
        });
      } else if (currentRecord.present) {
        // present -> absent
        const res = await fetch('/api/admin/attendance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, studentId, present: false }),
        });
        if (!res.ok) throw new Error();
        setGroup(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            lessons: prev.lessons.map(l =>
              l.id === lessonId
                ? { ...l, attendances: l.attendances.map(a => a.studentId === studentId ? { ...a, present: false } : a) }
                : l
            ),
          };
        });
      } else {
        // absent -> empty (delete)
        const res = await fetch('/api/admin/attendance', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, studentId }),
        });
        if (!res.ok) throw new Error();
        setGroup(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            lessons: prev.lessons.map(l =>
              l.id === lessonId
                ? { ...l, attendances: l.attendances.filter(a => a.studentId !== studentId) }
                : l
            ),
          };
        });
      }
    } catch {
      // silently fail, state unchanged
    } finally {
      setSavingCells(prev => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }
  }, [group, savingCells]);

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </>
    );
  }

  if (!group) {
    return (
      <>
        <div className="text-center py-20 text-slate-400">
          <p>Guruh topilmadi</p>
          <button onClick={() => router.push('/dashboard/admin/schedule')} className="text-blue-600 text-sm mt-2">Jadvalga qaytish</button>
        </div>
      </>
    );
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: 'davomat', label: 'Davomat' },
    { key: 'mavzular', label: 'Mavzular' },
    { key: 'oquvchilar', label: `O'quvchilar (${group.students.length})` },
  ];

  const notInGroup = allStudents.filter(s => !group.students.some(gs => gs.student.id === s.id));
  const lessonDates = group.lessons.map(l => l.scheduledDate).sort();
  const lastLessonDate = lessonDates.length ? lessonDates[lessonDates.length - 1] : (group.startDate || '');
  const searchResults = search.trim()
    ? notInGroup.filter(s => {
        const q = search.trim().toLowerCase();
        return s.name.toLowerCase().includes(q) || (s.phone || '').includes(q);
      }).slice(0, 8)
    : [];

  return (
    <>
      {/* Back */}
      <div className="mb-4">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </button>
      </div>

      {/* Group Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                group.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {group.status === 'active' ? 'Aktiv' : 'Arxiv'}
              </span>
            </div>
            {group.teacher && (
              <p className="text-sm text-slate-500 mt-1">
                Mentor: <span className="font-medium text-slate-700">{group.teacher.name}</span>
              </p>
            )}
          </div>

          <div className="flex items-start gap-6 text-sm flex-wrap">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Yo&apos;nalish</p>
              <p className="font-semibold text-slate-800 mt-0.5">{group.subject}</p>
            </div>
            {group.time && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dars vaqti</p>
                <p className="font-semibold text-slate-800 mt-0.5">{group.time}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dars kunlari</p>
              <p className="font-semibold text-slate-800 mt-0.5">{DAY_LABELS[group.dayType] || group.dayType || '—'}</p>
            </div>
            {group.room && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dars xonasi</p>
                <p className="font-semibold text-slate-800 mt-0.5">{group.room}</p>
              </div>
            )}
            {dateRange && (
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Muddat</p>
                <p className="font-semibold text-slate-800 mt-0.5">{dateRange}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Darslar soni</p>
              <p className="font-semibold text-slate-800 mt-0.5">{group._count.lessons}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dars generatsiya — belgilangan sanagacha */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-slate-500 flex items-center gap-1.5"><CalendarPlus className="w-4 h-4" /> Darslarni yarat:</span>
        <input type="date" value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2660A4]/20" />
        <span className="text-sm text-slate-400">dan</span>
        <input type="date" value={untilDate} min={fromDate || lastLessonDate || undefined}
          onChange={e => setUntilDate(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2660A4]/20" />
        <span className="text-sm text-slate-400">gacha</span>
        <button onClick={generateUntil} disabled={busy || !untilDate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2660A4] text-white text-xs font-semibold hover:bg-[#1d4e87] disabled:opacity-60">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />} Yaratish
        </button>
        <span className="text-xs text-slate-400 ml-auto">
          {group._count.lessons} ta dars{lastLessonDate ? ` · oxirgi: ${lastLessonDate.split('-').reverse().join('.')}` : ''}
        </span>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 px-6">
          <div className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-medium transition-all relative ${
                  activeTab === tab.key ? 'text-[#2660A4]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2660A4] rounded-t" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Davomat Tab */}
        {activeTab === 'davomat' && (
          <div>
            {/* Month pills */}
            {availableMonths.length > 0 && (
              <div className="px-6 py-4 flex items-center gap-2 overflow-x-auto border-b border-slate-100">
                {availableMonths.map(month => {
                  const [y, m] = month.split('-');
                  const label = `${MONTHS_SHORT[m] || m} ${y.slice(2)}`;
                  const isCurrent = selectedMonth === month;
                  const isCurrentMonth = month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  return (
                    <button
                      key={month}
                      onClick={() => setSelectedMonth(month)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                        isCurrent
                          ? isCurrentMonth
                            ? 'bg-[#2660A4] text-white border-[#2660A4]'
                            : 'bg-slate-800 text-white border-slate-800'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 bg-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Attendance table */}
            {filteredLessons.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">
                Bu oyda darslar mavjud emas
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left pl-6 pr-4 py-3 text-xs font-medium text-slate-400 sticky left-0 bg-white z-10 min-w-[250px]">
                        O&apos;quvchilar ro&apos;yxati
                      </th>
                      {filteredLessons.map(lesson => {
                        const [, m, d] = lesson.scheduledDate.split('-');
                        const isToday = isSameDay(lesson.scheduledDate);
                        return (
                          <th key={lesson.id} className="px-2 py-3 text-center min-w-[56px]">
                            <span className={`text-xs font-medium ${isToday ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                              {d}.{m}
                            </span>
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 min-w-[70px]">Bugun</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 min-w-[80px]">Umumiy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.students.map(({ student }, idx) => {
                      let totalPresent = 0;
                      let totalMarked = 0;
                      filteredLessons.forEach(l => {
                        const rec = l.attendances.find(a => a.studentId === student.id);
                        if (rec) { totalMarked++; if (rec.present) totalPresent++; }
                      });
                      const todayLesson = filteredLessons.find(l => isSameDay(l.scheduledDate));
                      const todayRecord = todayLesson?.attendances.find(a => a.studentId === student.id);

                      return (
                        <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="pl-6 pr-4 py-3 sticky left-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  student.status === 'active' ? 'bg-emerald-500' : student.status === 'frozen' ? 'bg-blue-400' : 'bg-slate-300'
                                }`} />
                                <span className="text-xs text-slate-400 w-4">{idx + 1}.</span>
                              </div>
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="text-sm text-slate-800 truncate cursor-pointer hover:text-[#2660A4]"
                                  onClick={() => router.push(`/dashboard/admin/students/${student.id}`)}
                                >
                                  <span className="font-bold">{student.name.split(' ')[0]}</span>
                                  {' '}
                                  <span className="font-normal">{student.name.split(' ').slice(1).join(' ')}</span>
                                </span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0 ${
                                  student.status === 'active' ? 'bg-emerald-100 text-emerald-700'
                                    : student.status === 'frozen' ? 'bg-blue-100 text-blue-600'
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {student.status === 'active' ? 'Aktiv' : student.status === 'frozen' ? 'Muzlatilgan' : 'Arxiv'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {filteredLessons.map(lesson => {
                            const record = lesson.attendances.find(a => a.studentId === student.id);
                            const cellKey = `${lesson.id}-${student.id}`;
                            const isSaving = savingCells.has(cellKey);
                            return (
                              <td key={lesson.id} className="px-1 py-2 text-center">
                                <button
                                  onClick={() => toggleAttendance(lesson.id, student.id, record)}
                                  disabled={isSaving}
                                  className="relative group"
                                  title={record ? (record.present ? 'Keldi → Kelmadi' : 'Kelmadi → Tozalash') : 'Belgilash → Keldi'}
                                >
                                  {isSaving ? (
                                    <div className="w-7 h-7 border-2 border-slate-200 rounded-md flex items-center justify-center mx-auto">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                                    </div>
                                  ) : record ? (
                                    record.present ? (
                                      <div className="w-7 h-7 bg-emerald-500 rounded-md flex items-center justify-center mx-auto hover:bg-emerald-600 transition-colors">
                                        <Check className="w-4 h-4 text-white stroke-[3]" />
                                      </div>
                                    ) : (
                                      <div className="w-7 h-7 bg-red-100 rounded-md flex items-center justify-center mx-auto hover:bg-red-200 transition-colors">
                                        <span className="text-red-500 text-xs font-bold">Y</span>
                                      </div>
                                    )
                                  ) : (
                                    <div className="w-7 h-7 border-2 border-slate-200 rounded-md mx-auto hover:border-emerald-400 hover:bg-emerald-50 transition-colors" />
                                  )}
                                </button>
                              </td>
                            );
                          })}

                          <td className="px-4 py-3 text-center">
                            {todayRecord ? (
                              todayRecord.present
                                ? <span className="text-emerald-600 font-semibold text-sm">Keldi</span>
                                : <span className="text-red-500 font-semibold text-sm">Yo&apos;q</span>
                            ) : <span className="text-slate-300 text-sm">—</span>}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm font-bold ${
                              totalMarked === 0 ? 'text-slate-300'
                                : (totalPresent / totalMarked) >= 0.8 ? 'text-emerald-600'
                                : (totalPresent / totalMarked) >= 0.5 ? 'text-amber-600'
                                : 'text-red-600'
                            }`}>
                              {totalMarked === 0 ? '—' : `${totalPresent}/${totalMarked}`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Mavzular / dars jadvali Tab */}
        {activeTab === 'mavzular' && (
          <div>
            {/* Yangi dars qo'shish */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              {!addOpen ? (
                <button onClick={() => { setEditId(null); setAddOpen(true); }}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2660A4] hover:underline">
                  <Plus className="w-4 h-4" /> Yangi dars qo&apos;shish
                </button>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Sana</label>
                    <input type="date" value={addForm.scheduledDate}
                      onChange={e => setAddForm(f => ({ ...f, scheduledDate: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Vaqt</label>
                    <input type="time" value={addForm.scheduledTime}
                      onChange={e => setAddForm(f => ({ ...f, scheduledTime: e.target.value }))}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800" />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Mavzu (ixtiyoriy)</label>
                    <input type="text" value={addForm.topic} placeholder="Mavzu nomi"
                      onChange={e => setAddForm(f => ({ ...f, topic: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addLesson} disabled={busy || !addForm.scheduledDate}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#2660A4] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f4f88] disabled:opacity-50">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Qo&apos;shish
                    </button>
                    <button onClick={() => setAddOpen(false)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Bekor</button>
                  </div>
                </div>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {group.lessons.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400">Darslar mavjud emas</div>
              ) : (
                group.lessons.map(lesson => {
                  const [, m, d] = lesson.scheduledDate.split('-').map(Number);
                  const isToday = isSameDay(lesson.scheduledDate);
                  const MONTHS_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
                  const editing = editId === lesson.id;
                  return (
                    <div key={lesson.id} className={`px-6 py-4 flex items-start gap-4 ${isToday ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                      <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                        isToday ? 'bg-[#2660A4] text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className="text-base font-bold leading-none">{d}</span>
                        <span className="text-[9px] uppercase leading-none mt-0.5">{MONTHS_UZ[m - 1]}</span>
                      </div>

                      {editing ? (
                        <div className="flex-1 flex flex-wrap items-end gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Sana</label>
                            <input type="date" value={editForm.scheduledDate}
                              onChange={e => setEditForm(f => ({ ...f, scheduledDate: e.target.value }))}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Vaqt</label>
                            <input type="time" value={editForm.scheduledTime}
                              onChange={e => setEditForm(f => ({ ...f, scheduledTime: e.target.value }))}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800" />
                          </div>
                          <div className="flex-1 min-w-[160px]">
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Mavzu</label>
                            <input type="text" value={editForm.topic} placeholder="Mavzu nomi"
                              onChange={e => setEditForm(f => ({ ...f, topic: e.target.value }))}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white text-slate-800" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={saveLesson} disabled={busy || !editForm.scheduledDate}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2660A4] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1f4f88] disabled:opacity-50">
                              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Saqlash
                            </button>
                            <button onClick={() => setEditId(null)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">Bekor</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-[#2660A4]">{lesson.order}-dars</span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {lesson.scheduledTime} · {lesson.duration}
                              </span>
                            </div>
                            {lesson.topic ? (
                              <p className="text-sm text-slate-800 font-medium flex items-center gap-1.5">
                                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {lesson.topic}
                              </p>
                            ) : (
                              <p className="text-xs text-amber-500 font-medium">Mavzu kiritilmagan</p>
                            )}
                            {lesson.attendances.length > 0 && (
                              <div className="flex items-center gap-3 mt-2 text-xs">
                                <span className="flex items-center gap-1 text-emerald-600">
                                  <UserCheck className="w-3.5 h-3.5" /> {lesson.attendances.filter(a => a.present).length} keldi
                                </span>
                                <span className="flex items-center gap-1 text-red-500">
                                  <UserX className="w-3.5 h-3.5" /> {lesson.attendances.filter(a => !a.present).length} kelmadi
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => startEdit(lesson)} title="Tahrirlash"
                              className="p-2 rounded-lg text-slate-400 hover:text-[#2660A4] hover:bg-slate-100">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteLesson(lesson)} title="O'chirish"
                              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* O'quvchilar Tab */}
        {activeTab === 'oquvchilar' && (
          <div className="p-6 space-y-6">
            {/* Mentor (o'qituvchi) tayinlash */}
            <div className="max-w-md">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> Mentor (o&apos;qituvchi)
              </label>
              <select value={group.teacher?.id || ''} onChange={e => changeMentor(e.target.value)} disabled={busy}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2660A4]/20 disabled:opacity-60">
                <option value="">Tanlanmagan</option>
                {allTeachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.subject ? ` — ${t.subject}` : ''}</option>
                ))}
              </select>
            </div>

            {/* O'quvchi qidirib qo'shish */}
            <div className="max-w-md">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> O&apos;quvchi qo&apos;shish
              </label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Ism yoki telefon bo'yicha qidiring..."
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2660A4]/20" />
              </div>
              {search.trim() && (
                <div className="mt-2 rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-slate-400 text-center">Topilmadi (yoki allaqachon guruhda)</p>
                  ) : searchResults.map(s => (
                    <button key={s.id} onClick={() => addStudent(s.id)} disabled={busy}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#2660A4]/[0.06] text-left disabled:opacity-60">
                      <span className="text-sm text-slate-800">
                        {s.name}{s.phone && <span className="text-xs text-slate-400 ml-2">{s.phone}</span>}
                      </span>
                      <Plus className="w-4 h-4 text-[#2660A4] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Guruhdagi o'quvchilar */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Guruhdagi o&apos;quvchilar ({group.students.length})</p>
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              {group.students.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-400">Guruhda o&apos;quvchi yo&apos;q</p>
              ) : (
                group.students.map(({ student }, i) => (
                  <div key={student.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                      <span className="text-sm font-medium text-slate-800 truncate cursor-pointer hover:text-[#2660A4]"
                        onClick={() => router.push(`/dashboard/admin/students/${student.id}`)}>{student.name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0 ${
                        student.status === 'active' ? 'bg-emerald-100 text-emerald-700' : student.status === 'frozen' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                      }`}>{student.status === 'active' ? 'Aktiv' : student.status === 'frozen' ? 'Muzlatilgan' : 'Arxiv'}</span>
                    </div>
                    <button onClick={() => removeStudent(student.id)} disabled={busy}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-60" title="Guruhdan chiqarish">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
