'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, Loader2, Snowflake, Archive, RotateCcw,
  X, Pencil, Send, GraduationCap, CheckCircle, XCircle,
  ChevronDown, ChevronRight, Printer, KeyRound,
} from 'lucide-react';
import Link from 'next/link';
import { computeBillable, groupCost } from '@/lib/billing-core';

// ─── Types ───
interface Teacher { id: string; name: string }
interface Group {
  id: string; name: string; subject: string; schedule: string;
  meetLink: string; mode: string; status: string; dayType: string; time: string;
  startDate: string; room: string; language: string;
  price: number; lessonsPerMonth: number;
  teacher: Teacher | null;
  _count: { students: number; lessons: number };
}
interface GroupStudent { group: Group }
interface Payment {
  id: string; amount: number; month: string;
  method: string; note: string | null; createdAt: string;
}
interface AttendanceRecord {
  id: string; present: boolean; markedAt: string;
  lesson: { id: string; scheduledDate: string; scheduledTime: string; order: number; groupId: string };
}
interface Note {
  id: string; type: string; text: string; createdAt: string;
}
interface StudentDetail {
  id: string; login: string; name: string; phone: string;
  role: string; subject: string | null; status: string; level: string | null;
  avatar: string | null; createdAt: string;
  groupStudents: GroupStudent[];
  payments: Payment[];
  attendances: AttendanceRecord[];
  notes: Note[];
}

// ─── Constants ───
const DAY_LABELS: Record<string, string> = { toq: 'Toq', juft: 'Juft', boshqa: 'Boshqa' };
const METHOD_LABELS: Record<string, { label: string; cls: string }> = {
  cash: { label: 'NAQD', cls: 'bg-emerald-100 text-emerald-700' },
  card: { label: 'KARTA', cls: 'bg-blue-100 text-blue-700' },
  transfer: { label: "O'TKAZMA", cls: 'bg-purple-100 text-purple-700' },
};
const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
const DAYS_SHORT = ['Ya', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha'];

function formatAmount(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtDate(d: string) {
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}
function fmtTime(d: string) {
  const date = new Date(d);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
function monthsBetween(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('finance');
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Modals
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', month: '', method: 'cash', note: '' });
  const [paySubmitting, setPaySubmitting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Notes
  const [noteText, setNoteText] = useState('');

  // Add to group / transfer
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [allGroups, setAllGroups] = useState<{ id: string; name: string; subject: string; _count: { students: number } }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [addingToGroup, setAddingToGroup] = useState(false);

  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [resetPassValue, setResetPassValue] = useState('');
  const [resetPassSubmitting, setResetPassSubmitting] = useState(false);

  const [statusChanging, setStatusChanging] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [markingDate, setMarkingDate] = useState<string | null>(null);

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const fetchStudent = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/users/${studentId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setStudent(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [studentId]);

  useEffect(() => { fetchStudent(); }, [fetchStudent]);

  const activeGroup = student?.groupStudents?.[activeGroupIdx]?.group || null;

  // ─── Computed stats ───
  const attendanceStats = useMemo(() => {
    if (!student) return { total: 0, present: 0, percent: 0 };
    const total = student.attendances.length;
    const present = student.attendances.filter(a => a.present).length;
    return { total, present, percent: total > 0 ? Math.round((present / total) * 100) : 0 };
  }, [student]);

  const bizBilan = useMemo(() => {
    if (!student) return 0;
    return monthsBetween(new Date(student.createdAt), now);
  }, [student]);

  // Per-lesson cost calculation
  const lessonCost = useMemo(() => {
    if (!activeGroup || !activeGroup.price || !activeGroup.lessonsPerMonth) return 0;
    return Math.round(activeGroup.price / activeGroup.lessonsPerMonth);
  }, [activeGroup]);

  // Deductions: hisoblanadigan (billable) darslar oy bo'yicha — grace qoidasi (billing-core)
  const deductionsByMonth = useMemo(() => {
    const map = new Map<string, { lessons: number; total: number }>();
    if (!student || !activeGroup || !activeGroup.price || !activeGroup.lessonsPerMonth) return map;
    const cost = Math.round(activeGroup.price / activeGroup.lessonsPerMonth);
    const recs = student.attendances
      .filter(a => a.lesson.groupId === activeGroup.id)
      .sort((a, b) => a.lesson.scheduledDate.localeCompare(b.lesson.scheduledDate) || a.lesson.order - b.lesson.order)
      .map(a => ({ scheduledDate: a.lesson.scheduledDate, present: a.present }));
    const { billableDates } = computeBillable(recs);
    billableDates.forEach(d => {
      const monthKey = d.slice(0, 7); // "2026-07"
      const curr = map.get(monthKey) || { lessons: 0, total: 0 };
      curr.lessons += 1;
      curr.total += cost;
      map.set(monthKey, curr);
    });
    return map;
  }, [student, activeGroup]);

  const paymentStats = useMemo(() => {
    if (!student) return { thisMonth: 0, total: 0, deducted: 0, balance: 0 };
    const thisMonth = student.payments
      .filter(p => p.month === currentMonth)
      .reduce((s, p) => s + p.amount, 0);
    const total = student.payments.reduce((s, p) => s + p.amount, 0);
    // Jami hisoblangan — grace qoidasi (billing-core), student/admin-stats bilan bir xil
    let deducted = 0;
    student.groupStudents.forEach(gs => {
      const g = gs.group;
      if (!g.price || !g.lessonsPerMonth) return;
      const recs = student.attendances
        .filter(a => a.lesson.groupId === g.id)
        .sort((a, b) => a.lesson.scheduledDate.localeCompare(b.lesson.scheduledDate) || a.lesson.order - b.lesson.order)
        .map(a => ({ scheduledDate: a.lesson.scheduledDate, present: a.present }));
      const { billableCount } = computeBillable(recs);
      deducted += groupCost(billableCount, g.price, g.lessonsPerMonth);
    });
    return { thisMonth, total, deducted, balance: total - deducted };
  }, [student, currentMonth]);

  const paymentsByMonth = useMemo(() => {
    if (!student) return [];
    const map: Record<string, { month: string; payments: Payment[]; total: number }> = {};
    student.payments.forEach(p => {
      if (!map[p.month]) map[p.month] = { month: p.month, payments: [], total: 0 };
      map[p.month].payments.push(p);
      map[p.month].total += p.amount;
    });
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }, [student]);

  // Attendance calendar
  const attendanceDates = useMemo(() => {
    if (!student) return new Map<string, boolean>();
    const map = new Map<string, boolean>();
    student.attendances.forEach(a => { map.set(a.lesson.scheduledDate, a.present); });
    return map;
  }, [student]);

  const calendarMonths = useMemo(() => {
    const months: { key: string; label: string; count: number; days: { date: string; dayName: string; num: number; present?: boolean }[] }[] = [];
    for (let i = -3; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTHS_UZ[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const days: typeof months[0]['days'] = [];
      let count = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayDate = new Date(d.getFullYear(), d.getMonth(), day);
        const present = attendanceDates.has(dateStr) ? attendanceDates.get(dateStr) : undefined;
        if (present !== undefined) count++;
        days.push({ date: dateStr, dayName: DAYS_SHORT[dayDate.getDay()], num: day, present });
      }
      months.push({ key: monthKey, label, count, days });
    }
    return months;
  }, [attendanceDates]);

  // ─── Handlers ───
  const openStatusModal = (newStatus: string) => {
    setPendingStatus(newStatus);
    setStatusComment('');
    setShowStatusModal(true);
  };

  const handleStatusChange = async () => {
    if (!student || !pendingStatus) return;
    setStatusChanging(true);
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: student.id, status: pendingStatus }),
    });
    // Save comment as a note
    if (statusComment.trim()) {
      await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          type: pendingStatus === 'frozen' ? 'frozen' : 'archived',
          text: statusComment.trim(),
        }),
      });
    }
    setShowStatusModal(false);
    setStatusChanging(false);
    fetchStudent();
  };

  const handleStatusChangeQuick = async (newStatus: string) => {
    if (!student) return;
    setStatusChanging(true);
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: student.id, status: newStatus }),
    });
    fetchStudent();
    setStatusChanging(false);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaySubmitting(true);
    await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId, amount: payForm.amount,
        month: payForm.month || currentMonth,
        method: payForm.method, note: payForm.note || null,
      }),
    });
    setShowPayModal(false);
    setPayForm({ amount: '', month: '', method: 'cash', note: '' });
    setPaySubmitting(false);
    fetchStudent();
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Bu to'lovni o'chirmoqchimisiz?")) return;
    await fetch('/api/admin/payments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: paymentId }),
    });
    fetchStudent();
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: student!.id, name: editForm.name, phone: editForm.phone }),
    });
    setShowEditModal(false);
    setEditSubmitting(false);
    fetchStudent();
  };

  const handleMarkAttendance = async (date: string, currentPresent: boolean | undefined) => {
    if (!student || !activeGroup) return;
    setMarkingDate(date);

    // Cycle: undefined → keldi (true) → kelmadi (false) → o'chirish (undefined)
    if (currentPresent === undefined) {
      // Mark as present
      await fetch('/api/admin/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: activeGroup.id,
          studentId: student.id,
          date,
          time: activeGroup.time || '00:00',
          present: true,
        }),
      });
    } else if (currentPresent === true) {
      // Switch to absent
      const att = student.attendances.find(a => a.lesson.scheduledDate === date);
      if (att) {
        await fetch('/api/admin/attendance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId: att.lesson.id, studentId: student.id, present: false }),
        });
      }
    } else {
      // Delete attendance
      const att = student.attendances.find(a => a.lesson.scheduledDate === date);
      if (att) {
        await fetch('/api/admin/attendance', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId: att.lesson.id, studentId: student.id }),
        });
      }
    }

    setMarkingDate(null);
    fetchStudent();
  };

  const fetchGroups = async () => {
    const res = await fetch('/api/admin/groups');
    if (res.ok) {
      const groups = await res.json();
      // Filter out groups student is already in
      const studentGroupIds = new Set(student?.groupStudents.map(gs => gs.group.id) || []);
      setAllGroups(groups.filter((g: { id: string }) => !studentGroupIds.has(g.id)));
    }
  };

  const handleAddToGroup = async () => {
    if (!selectedGroupId || !student) return;
    setAddingToGroup(true);
    await fetch('/api/admin/groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedGroupId, addStudentId: student.id }),
    });
    setAddingToGroup(false);
    setShowGroupModal(false);
    setSelectedGroupId('');
    fetchStudent();
  };

  const handleRemoveFromGroup = async () => {
    if (!student || !activeGroup) return;
    if (!confirm(`${student.name}ni "${activeGroup.name}" guruhidan chiqarmoqchimisiz?`)) return;
    await fetch('/api/admin/groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeGroup.id, removeStudentId: student.id }),
    });
    setActiveGroupIdx(0);
    fetchStudent();
  };

  const handleTransferGroup = async () => {
    if (!selectedGroupId || !student || !activeGroup) return;
    setAddingToGroup(true);
    await fetch('/api/admin/groups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeGroup.id, moveStudentId: student.id, toGroupId: selectedGroupId }),
    });
    setAddingToGroup(false);
    setShowTransferModal(false);
    setSelectedGroupId('');
    setActiveGroupIdx(0);
    fetchStudent();
  };

  const statusBadge = (status: string) => {
    if (status === 'frozen') return { text: 'Muzlatilgan', cls: 'bg-blue-50 text-blue-600 border-blue-200' };
    if (status === 'archived') return { text: 'Arxivlangan', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
    return { text: 'Aktiv', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  };

  // ─── Loading / Not found ───
  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          <span className="ml-2 text-slate-400 text-sm">Yuklanmoqda...</span>
        </div>
      </>
    );
  }

  if (!student) {
    return (
      <>
        <div className="text-center py-20">
          <p className="text-slate-500">O&apos;quvchi topilmadi</p>
          <Link href="/dashboard/admin/students" className="text-blue-600 text-sm mt-2 inline-block">Orqaga qaytish</Link>
        </div>
      </>
    );
  }

  const badge = statusBadge(student.status);
  const joinDate = new Date(student.createdAt);
  const joinStr = `${joinDate.getDate()} ${MONTHS_UZ[joinDate.getMonth()].toLowerCase()} ${joinDate.getFullYear()}`;

  const tabs = [
    { key: 'finance', label: 'Finance' },
    { key: 'academy', label: 'Academy' },
    { key: 'history', label: 'Tarix' },
  ];

  return (
    <>
      {/* Back */}
      <div className="mb-4">
        <button onClick={() => router.push('/dashboard/admin/students')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Studentlar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ═══════════ LEFT COLUMN ═══════════ */}
        <div className="lg:col-span-4 space-y-4">
          {/* ── Profile card ── */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            {/* Name */}
            <div className="flex items-start justify-between mb-1">
              <h1 className="text-xl font-bold text-slate-900">{student.name}</h1>
            </div>

            {/* Status + meta + Shaxsiy button */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${badge.cls}`}>{badge.text}</span>
                <span className="text-xs text-slate-400 font-semibold">#{student.login}</span>
                <span className="text-xs text-slate-400">· {joinStr}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(student.login);
                  alert('Login nusxalandi!');
                }}
                className="px-3 py-1 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                Login nusxalash
              </button>
            </div>

            {/* Phone rows */}
            <div className="space-y-0 mb-4">
              {student.phone ? (
                <div className="flex items-center justify-between py-3 border-b border-slate-100 bg-slate-50/50 px-3 rounded-t-lg">
                  <span className="text-sm text-slate-500">Ozi</span>
                  <a href={`tel:${student.phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-emerald-600">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    {student.phone}
                  </a>
                </div>
              ) : (
                <div className="flex items-center justify-between py-3 border-b border-slate-100 bg-slate-50/50 px-3 rounded-t-lg">
                  <span className="text-sm text-slate-500">Telefon</span>
                  <span className="text-sm text-slate-300 italic">Kiritilmagan</span>
                </div>
              )}
              <div className="flex items-center justify-between py-3 border-b border-slate-100 bg-slate-50/50 px-3">
                <span className="text-sm text-slate-500">Login</span>
                <span className="text-sm font-mono font-bold text-slate-800">{student.login}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100 bg-slate-50/50 px-3 rounded-b-lg">
                <span className="text-sm text-slate-500">Parol</span>
                <button
                  onClick={() => { setResetPassValue(''); setShowResetPassModal(true); }}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700">
                  <KeyRound className="w-3.5 h-3.5" /> Parolni yangilash
                </button>
              </div>
              {/* Kurs info is shown in group card */}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mb-5">
              {student.status === 'active' && (
                <>
                  <button onClick={() => openStatusModal('frozen')} disabled={statusChanging}
                    className="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors">
                    ❄️ Muzlatish
                  </button>
                  <button onClick={() => openStatusModal('archived')} disabled={statusChanging}
                    className="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                    📦 Arxivlash
                  </button>
                  <button className="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-colors">
                    🎓 Bitiruvchi
                  </button>
                </>
              )}
              {(student.status === 'frozen' || student.status === 'archived') && (
                <button onClick={() => handleStatusChangeQuick('active')} disabled={statusChanging}
                  className="px-3 py-1.5 rounded-full border border-emerald-200 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors">
                  ♻️ Faollashtirish
                </button>
              )}
              <button
                onClick={() => {
                  setEditForm({ name: student.name, phone: student.phone || '' });
                  setShowEditModal(true);
                }}
                className="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                ✏️ Tahrirlash
              </button>
            </div>

            {/* Big buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { fetchGroups(); setShowGroupModal(true); }}
                className="text-center px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                Guruhga qo&apos;shish
              </button>
              <button
                onClick={() => {
                  setPayForm({ amount: '', month: currentMonth, method: 'cash', note: '' });
                  setShowPayModal(true);
                }}
                className="px-3 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-semibold hover:from-red-600 hover:to-orange-600 transition-colors">
                + Hisobni to&apos;ldirish
              </button>
            </div>
          </div>

          {/* ── Stats row (4 cards like Mars IT) ── */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-lg font-bold text-slate-900">{bizBilan}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider leading-tight mt-0.5">
                Oy biz bilan
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-lg font-bold text-slate-900">{attendanceStats.percent}%</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider leading-tight mt-0.5">
                Davomat ({attendanceStats.total})
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-lg font-bold text-slate-900">{student.groupStudents.length}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider leading-tight mt-0.5">
                Guruhlar
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-lg font-bold text-emerald-600">{student.payments.length}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider leading-tight mt-0.5">
                To&apos;lovlar
              </p>
            </div>
          </div>

          {/* ── Izohlar (Notes/Comments) ── */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Izohlar</h3>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && noteText.trim()) {
                    fetch('/api/admin/notes', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ studentId: student.id, type: 'comment', text: noteText.trim() }),
                    }).then(() => { setNoteText(''); fetchStudent(); });
                  }
                }}
                placeholder="Izohni kiriting..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                onClick={() => {
                  if (!noteText.trim()) return;
                  fetch('/api/admin/notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId: student.id, type: 'comment', text: noteText.trim() }),
                  }).then(() => { setNoteText(''); fetchStudent(); });
                }}
                className="p-2 rounded-lg text-blue-500 hover:bg-blue-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {student.notes.map(n => {
                const typeLabel = n.type === 'frozen' ? '❄️' : n.type === 'archived' ? '📦' : '';
                return (
                  <div key={n.id} className="flex items-start gap-2 text-xs">
                    <div className={`w-0.5 min-h-[20px] rounded-full mt-1 flex-shrink-0 ${
                      n.type === 'frozen' ? 'bg-blue-400' : n.type === 'archived' ? 'bg-red-400' : 'bg-slate-300'
                    }`} />
                    <div className="flex-1">
                      <p className="text-slate-600">{typeLabel} {n.text}</p>
                      <p className="text-slate-400 mt-0.5">{fmtDate(n.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              {student.notes.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">Izohlar yo&apos;q</p>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════ RIGHT COLUMN ═══════════ */}
        <div className="lg:col-span-8 space-y-4">
          {/* ── Group info card ── */}
          {activeGroup ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-900">{activeGroup.name}</h2>
                  {student.groupStudents.length > 1 && (
                    <div className="flex gap-1">
                      {student.groupStudents.map((gs, idx) => (
                        <button key={gs.group.id} onClick={() => setActiveGroupIdx(idx)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            idx === activeGroupIdx ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                          }`}>
                          {gs.group.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { fetchGroups(); setShowTransferModal(true); }}
                    className="px-2.5 py-1 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
                    O&apos;tkazish
                  </button>
                  <button
                    onClick={handleRemoveFromGroup}
                    className="px-2.5 py-1 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                    Chiqarish
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="p-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Kurs</p>
                  <p className="text-sm font-bold text-slate-800">{activeGroup.subject}</p>
                </div>
                <div className="p-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Mentor</p>
                  <p className="text-sm font-bold text-slate-800">{activeGroup.teacher?.name || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
                <div className="p-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Dars vaqti</p>
                  <p className="text-sm font-bold text-slate-800">
                    {activeGroup.time || '—'} · {DAY_LABELS[activeGroup.dayType] || activeGroup.dayType}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Kurs davomiyligi</p>
                  <p className="text-sm font-bold text-slate-800">
                    {activeGroup.startDate ? `${fmtDate(activeGroup.startDate)} dan` : '—'}
                  </p>
                </div>
              </div>
              {activeGroup.price > 0 && (
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                  <div className="p-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Oylik narx</p>
                    <p className="text-sm font-bold text-slate-800">{formatAmount(activeGroup.price)} so&apos;m</p>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">1 dars narxi</p>
                    <p className="text-sm font-bold text-orange-600">{formatAmount(lessonCost)} so&apos;m</p>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Oyiga darslar</p>
                    <p className="text-sm font-bold text-slate-800">{activeGroup.lessonsPerMonth} ta</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Guruh biriktirilmagan</p>
            </div>
          )}

          {/* ── Finance summary card ── */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {MONTHS_UZ[now.getMonth()]} {now.getFullYear()}
                </h3>
                <span className={`text-xs font-semibold ${paymentStats.thisMonth > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {paymentStats.thisMonth > 0 ? "To'langan" : "To'lanmagan"}
                </span>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${paymentStats.balance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
                  {formatAmount(paymentStats.balance)} <span className="text-sm font-normal text-slate-400">so&apos;m</span>
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Balans</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              <div>
                <p className="text-slate-400">Jami to&apos;langan</p>
                <p className="font-bold text-emerald-600">{formatAmount(paymentStats.total)} so&apos;m</p>
              </div>
              <div>
                <p className="text-slate-400">Darslar uchun yechilgan</p>
                <p className="font-bold text-orange-600">-{formatAmount(paymentStats.deducted)} so&apos;m</p>
              </div>
              <div>
                <p className="text-slate-400">To&apos;lovlar soni</p>
                <p className="font-bold text-slate-700">{student.payments.length} ta</p>
              </div>
            </div>
          </div>

          {/* ── Attendance calendar ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Davomat</p>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" /> Keldi</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Kelmadi</span>
                {activeGroup && (
                  <span className="text-slate-400 ml-1">· Bosing</span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="flex px-4 py-3 gap-3 min-w-max">
                {calendarMonths.map(month => (
                  <div key={month.key}>
                    <div className="flex items-center justify-between mb-2 px-0.5">
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{month.label}</span>
                      {month.count > 0 && (
                        <span className="text-[10px] text-emerald-500 font-bold ml-1">{month.count}</span>
                      )}
                    </div>
                    <div className="flex gap-0.5">
                      {month.days.map(day => {
                        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                        const isToday = day.date === todayStr;
                        const isFuture = new Date(day.date) > now;
                        const isMarking = markingDate === day.date;
                        let bg = 'bg-slate-50 text-slate-300';
                        if (day.present === true) bg = 'bg-emerald-100 text-emerald-700';
                        if (day.present === false) bg = 'bg-red-100 text-red-600';
                        const canClick = activeGroup && !isFuture && !isMarking;
                        return (
                          <button
                            key={day.date}
                            disabled={!canClick}
                            onClick={() => canClick && handleMarkAttendance(day.date, day.present)}
                            title={
                              !activeGroup ? 'Guruh biriktirilmagan' :
                              isFuture ? 'Kelajak sana' :
                              day.present === undefined ? 'Keldi deb belgilash' :
                              day.present ? 'Kelmadi deb belgilash' : "O'chirish"
                            }
                            className={`flex flex-col items-center w-7 py-1 rounded-md text-[9px] transition-all ${bg} ${
                              isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                            } ${canClick ? 'cursor-pointer hover:scale-110 hover:shadow-md' : 'cursor-default'} ${
                              isMarking ? 'animate-pulse' : ''
                            }`}>
                            <span className="font-bold">{day.num}</span>
                            <span className="opacity-60">{day.dayName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.key ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* ── Finance tab ── */}
              {activeTab === 'finance' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900">To&apos;lovlar tarixi</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setPayForm({ amount: '', month: currentMonth, method: 'cash', note: '' }); setShowPayModal(true); }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                        + To&apos;lov qo&apos;shish
                      </button>
                    </div>
                  </div>

                  {paymentsByMonth.length === 0 ? (
                    <p className="text-sm text-slate-400 py-8 text-center">To&apos;lovlar yo&apos;q</p>
                  ) : (
                    <div className="space-y-2">
                      {paymentsByMonth.map(group => {
                        const [y, m] = group.month.split('-');
                        const monthLabel = `${MONTHS_UZ[parseInt(m) - 1]} ${y}`;
                        const isExpanded = expandedMonth === group.month;

                        return (
                          <div key={group.month} className="border border-slate-100 rounded-lg overflow-hidden">
                            {/* Month header (clickable) */}
                            <button
                              onClick={() => setExpandedMonth(isExpanded ? null : group.month)}
                              className="w-full flex items-center justify-between py-3 px-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-slate-700">{monthLabel}</span>
                                <span className="text-xs text-slate-400">{group.payments.length} ta to&apos;lov</span>
                                <span className="text-sm font-bold text-emerald-600">{formatAmount(group.total)} so&apos;m</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-600">To&apos;langan</span>
                              </div>
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            </button>

                            {/* Expanded content */}
                            {isExpanded && (
                              <div className="divide-y divide-slate-50">
                                {/* Oylik hisob */}
                                <div className="px-4 py-3 bg-white">
                                  <p className="text-xs font-semibold text-slate-500 mb-2">Oylik hisob</p>
                                  {(() => {
                                    const ded = deductionsByMonth.get(group.month);
                                    const dedTotal = ded?.total || 0;
                                    const dedLessons = ded?.lessons || 0;
                                    const monthBalance = group.total - dedTotal;
                                    return (
                                      <div className="space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                          <span className="text-slate-600">To&apos;langan</span>
                                          <span className="font-bold text-emerald-600">+{formatAmount(group.total)} so&apos;m</span>
                                        </div>
                                        {dedTotal > 0 && (
                                          <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Darslar uchun yechilgan ({dedLessons} ta × {formatAmount(lessonCost)})</span>
                                            <span className="font-bold text-orange-600">-{formatAmount(dedTotal)} so&apos;m</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between text-sm pt-1.5 border-t border-slate-100">
                                          <span className="text-slate-700 font-medium">Qoldiq</span>
                                          <span className={`font-bold ${monthBalance >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                                            {formatAmount(monthBalance)} so&apos;m
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* To'lovlar ro'yxati */}
                                <div className="px-4 py-3 bg-white">
                                  <p className="text-xs font-semibold text-slate-500 mb-2">To&apos;lovlar ({group.payments.length} ta)</p>
                                  {group.payments.map(payment => {
                                    const met = METHOD_LABELS[payment.method] || METHOD_LABELS.cash;
                                    return (
                                      <div key={payment.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-bold text-emerald-600">+{formatAmount(payment.amount)}</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${met.cls}`}>{met.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs text-slate-400">{fmtDate(payment.createdAt)} {fmtTime(payment.createdAt)}</span>
                                          <button onClick={() => handleDeletePayment(payment.id)}
                                            className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50"
                                            title="O'chirish">
                                            <XCircle className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Academy tab ── */}
              {activeTab === 'academy' && (
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-4">Davomat tarixi</h3>
                  {student.attendances.length === 0 ? (
                    <p className="text-sm text-slate-400 py-8 text-center">Davomat ma&apos;lumotlari yo&apos;q</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500">Sana</th>
                            <th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500">Vaqt</th>
                            <th className="text-center py-2.5 px-3 text-xs font-medium text-slate-500">Holat</th>
                          </tr>
                        </thead>
                        <tbody>
                          {student.attendances.map(a => (
                            <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 text-slate-700">{a.lesson.scheduledDate}</td>
                              <td className="py-2.5 px-3 text-slate-500">{a.lesson.scheduledTime}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                                  a.present ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                                }`}>
                                  {a.present ? <><CheckCircle className="w-3 h-3" /> Keldi</> : <><XCircle className="w-3 h-3" /> Kelmadi</>}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── History tab ── */}
              {activeTab === 'history' && (
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-4">Tarix</h3>
                  <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                    {/* Registration */}
                    <div className="relative">
                      <div className="absolute -left-[21px] top-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                      <p className="text-sm text-slate-700 font-medium">Ro&apos;yxatdan o&apos;tdi</p>
                      <p className="text-xs text-slate-400">{joinStr}</p>
                    </div>

                    {/* Group joins */}
                    {student.groupStudents.map(gs => (
                      <div key={gs.group.id} className="relative">
                        <div className="absolute -left-[21px] top-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                        <p className="text-sm text-slate-700 font-medium">
                          <span className="font-bold">{gs.group.name}</span> guruhiga qo&apos;shildi
                        </p>
                        <p className="text-xs text-slate-400">{gs.group.subject} · {gs.group.teacher?.name || ''}</p>
                      </div>
                    ))}

                    {/* Combined timeline: payments + notes sorted by date */}
                    {[
                      ...student.payments.map(p => ({ kind: 'payment' as const, date: p.createdAt, data: p })),
                      ...student.notes.map(n => ({ kind: 'note' as const, date: n.createdAt, data: n })),
                    ]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 30)
                      .map(item => {
                        if (item.kind === 'payment') {
                          const p = item.data as Payment;
                          const met = METHOD_LABELS[p.method] || METHOD_LABELS.cash;
                          return (
                            <div key={`pay-${p.id}`} className="relative">
                              <div className="absolute -left-[21px] top-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-slate-700">
                                  To&apos;lov: <strong className="text-emerald-600">{formatAmount(p.amount)} so&apos;m</strong>
                                </p>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${met.cls}`}>{met.label}</span>
                              </div>
                              <p className="text-xs text-slate-400">{fmtDate(p.createdAt)} {fmtTime(p.createdAt)}</p>
                              {p.note && <p className="text-xs text-slate-500 mt-0.5">&quot;{p.note}&quot;</p>}
                            </div>
                          );
                        }
                        const n = item.data as Note;
                        const noteConfig: Record<string, { icon: string; dot: string; label: string }> = {
                          frozen: { icon: '❄️', dot: 'bg-blue-400', label: 'Muzlatish' },
                          archived: { icon: '📦', dot: 'bg-red-400', label: 'Arxivlash' },
                          comment: { icon: '💬', dot: 'bg-slate-400', label: 'Izoh' },
                        };
                        const cfg = noteConfig[n.type] || noteConfig.comment;
                        return (
                          <div key={`note-${n.id}`} className="relative">
                            <div className={`absolute -left-[21px] top-0.5 w-3 h-3 ${cfg.dot} rounded-full border-2 border-white`} />
                            <p className="text-sm text-slate-700 font-medium">
                              {cfg.icon} {cfg.label}
                            </p>
                            <p className="text-sm text-slate-600 mt-0.5">{n.text}</p>
                            <p className="text-xs text-slate-400">{fmtDate(n.createdAt)} {fmtTime(n.createdAt)}</p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Payment Modal ═══ */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPayModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">To&apos;lov qo&apos;shish</h2>
              <button onClick={() => setShowPayModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">{student.name}</p>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Summa (so&apos;m) *</label>
                <input type="number" required min="1000" value={payForm.amount}
                  onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="500000" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Oy *</label>
                  <input type="month" required value={payForm.month}
                    onChange={e => setPayForm(p => ({ ...p, month: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Usul</label>
                  <select value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="cash">Naqd</option>
                    <option value="card">Karta (UZCARD)</option>
                    <option value="transfer">O&apos;tkazma</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Izoh</label>
                <input type="text" value={payForm.note}
                  onChange={e => setPayForm(p => ({ ...p, note: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ixtiyoriy izoh..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPayModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Bekor qilish
                </button>
                <button type="submit" disabled={paySubmitting}
                  className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
                  {paySubmitting ? 'Saqlanmoqda...' : "To'lov qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Edit Modal ═══ */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">O&apos;quvchini tahrirlash</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ism familiya</label>
                <input type="text" required value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                <input type="text" value={editForm.phone}
                  onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="+998 90 123 45 67" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Bekor qilish
                </button>
                <button type="submit" disabled={editSubmitting}
                  className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                  {editSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ═══ Status Change Modal (with comment) ═══ */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowStatusModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {pendingStatus === 'frozen' ? '❄️ Muzlatish' : '📦 Arxivlash'}
              </h2>
              <button onClick={() => setShowStatusModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-1">{student.name}</p>
            <p className="text-xs text-slate-400 mb-4">
              {pendingStatus === 'frozen'
                ? "O'quvchini muzlatish sababini yozing"
                : "O'quvchini arxivlash sababini yozing"}
            </p>
            <textarea
              value={statusComment}
              onChange={e => setStatusComment(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              placeholder="Sabab yozing... (majburiy)"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Bekor qilish
              </button>
              <button
                onClick={handleStatusChange}
                disabled={statusChanging || !statusComment.trim()}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 ${
                  pendingStatus === 'frozen'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}>
                {statusChanging ? 'Saqlanmoqda...' : pendingStatus === 'frozen' ? 'Muzlatish' : 'Arxivlash'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ═══ Transfer Group Modal ═══ */}
      {showTransferModal && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTransferModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Guruhga o&apos;tkazish</h2>
              <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              <span className="font-medium text-slate-700">{activeGroup.name}</span> dan boshqa guruhga o&apos;tkazish
            </p>
            {allGroups.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Boshqa guruhlar topilmadi</p>
            ) : (
              <>
                <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                  {allGroups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        selectedGroupId === g.id
                          ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}>
                      <div className="font-semibold text-sm text-slate-900">{g.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {g.subject} · {g._count.students} ta o&apos;quvchi
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Bekor qilish
                  </button>
                  <button
                    onClick={handleTransferGroup}
                    disabled={!selectedGroupId || addingToGroup}
                    className="flex-1 bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">
                    {addingToGroup ? "O'tkazilmoqda..." : "O'tkazish"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* ═══ Add to Group Modal ═══ */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowGroupModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Guruhga qo&apos;shish</h2>
              <button onClick={() => setShowGroupModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            {allGroups.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Mavjud guruhlar topilmadi</p>
            ) : (
              <>
                <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                  {allGroups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGroupId(g.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                        selectedGroupId === g.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}>
                      <div className="font-semibold text-sm text-slate-900">{g.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {g.subject} · {g._count.students} ta o&apos;quvchi
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowGroupModal(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Bekor qilish
                  </button>
                  <button
                    onClick={handleAddToGroup}
                    disabled={!selectedGroupId || addingToGroup}
                    className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                    {addingToGroup ? "Qo'shilmoqda..." : "Qo'shish"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* ═══ Reset Password Modal ═══ */}
      {showResetPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowResetPassModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Parolni yangilash</h2>
              <button onClick={() => setShowResetPassModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">{student.name} uchun yangi parol</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!resetPassValue.trim() || resetPassValue.length < 4) return;
              setResetPassSubmitting(true);
              const res = await fetch('/api/admin/users/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: student.id, newPassword: resetPassValue }),
              });
              setResetPassSubmitting(false);
              if (res.ok) {
                setShowResetPassModal(false);
                alert('Parol muvaffaqiyatli yangilandi!');
              } else {
                alert('Xatolik yuz berdi');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Yangi parol</label>
                <input type="text" required minLength={4} value={resetPassValue}
                  onChange={e => setResetPassValue(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Kamida 4 ta belgi" autoFocus />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowResetPassModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Bekor qilish
                </button>
                <button type="submit" disabled={resetPassSubmitting || resetPassValue.length < 4}
                  className="flex-1 bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60">
                  {resetPassSubmitting ? 'Saqlanmoqda...' : 'Yangilash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
