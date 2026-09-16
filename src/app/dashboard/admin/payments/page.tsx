"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "@/components/toast";
import { Skeleton } from "@/components/skeleton";
import { StudentSearchSelect, type StudentLite } from "@/components/student-search-select";
import {
  Plus,
  Trash2,
  X,
  DollarSign,
  CalendarDays,
  AlertTriangle,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  UserX,
  UserCheck,
  Pencil,
} from "lucide-react";
import { fmtDate } from "@/lib/date";

interface Student {
  id: string;
  name: string;
  email: string;
}

interface Payment {
  id: string;
  studentId: string;
  student: Student;
  amount: number;
  month: string;
  method: string;
  note: string | null;
  createdAt: string;
}

function formatAmount(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function tzNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
}

function getCurrentMonth(): string {
  const now = tzNow();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const monthNames = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
  ];
  const now = tzNow();

  for (let i = -6; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const value = `${year}-${month}`;
    const label = `${monthNames[d.getMonth()]} ${year}`;
    options.push({ value, label });
  }

  return options;
}

function getMethodLabel(method: string): string {
  switch (method) {
    case "cash":
      return "Naqd";
    case "card":
      return "Karta";
    case "transfer":
      return "O'tkazma";
    default:
      return method;
  }
}

function getMethodIcon(method: string) {
  switch (method) {
    case "cash":
      return <Banknote className="w-4 h-4" />;
    case "card":
      return <CreditCard className="w-4 h-4" />;
    case "transfer":
      return <ArrowRightLeft className="w-4 h-4" />;
    default:
      return <DollarSign className="w-4 h-4" />;
  }
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pickedStudent, setPickedStudent] = useState<StudentLite | null>(null); // modal picker uchun
  const [summary, setSummary] = useState<{ totalIncome: number; todayIncome: number; paidThisMonth: number; unpaidThisMonth: number; debtorCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Tahrirlash / o'chirish — har ikkisida majburiy izoh (sabab)
  const [editTarget, setEditTarget] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState({ amount: "", month: "", method: "cash", note: "" });
  const [editReason, setEditReason] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const [form, setForm] = useState({
    studentId: "",
    amount: "",
    month: getCurrentMonth(),
    method: "cash",
    note: "",
  });

  const monthOptions = getMonthOptions();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch {
      console.error("To'lovlarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  // Statistika kartalari — BUTUN filial bo'yicha, server hisoblaydi (limit=500 truncate emas)
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/payments/summary?month=${selectedMonth}`);
      if (res.ok) setSummary(await res.json());
    } catch {
      console.error("Statistikani yuklashda xatolik");
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Pagination (statistikaga ta'sir qilmaydi — faqat jadval qatorlari sahifalanadi)
  const totalPages = Math.ceil(payments.length / PAGE_SIZE);
  const paginatedPayments = payments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => { setCurrentPage(1); }, [selectedMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId || !form.amount || !form.month) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: form.studentId,
          amount: Number(form.amount),
          month: form.month,
          method: form.method,
          note: form.note || undefined,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setPickedStudent(null);
        setForm({
          studentId: "",
          amount: "",
          month: getCurrentMonth(),
          method: "cash",
          note: "",
        });
        fetchPayments();
        fetchSummary();
      }
    } catch {
      console.error("To'lov yaratishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  // O'chirish — majburiy izoh bilan (modal orqali)
  const openDelete = (p: Payment) => { setDeleteTarget(p); setDeleteReason(""); };
  const submitDelete = async () => {
    if (!deleteTarget) return;
    if (deleteReason.trim().length < 3) { toast.error("O'chirish sababini yozing (kamida 3 belgi)"); return; }
    setDeleting(deleteTarget.id);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id, reason: deleteReason.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || "Xatolik"); return; }
      toast.success("To'lov o'chirildi");
      setDeleteTarget(null);
      fetchPayments();
      fetchSummary();
    } catch {
      toast.error("To'lovni o'chirishda xatolik");
    } finally {
      setDeleting(null);
    }
  };

  // Tahrirlash — majburiy izoh bilan (modal orqali)
  const openEdit = (p: Payment) => {
    setEditTarget(p);
    setEditForm({ amount: String(Math.abs(p.amount)), month: p.month, method: p.method || "cash", note: p.note || "" });
    setEditReason("");
  };
  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (editReason.trim().length < 3) { toast.error("O'zgartirish sababini yozing (kamida 3 belgi)"); return; }
    setEditSubmitting(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          amount: Number(editForm.amount),
          month: editForm.month,
          method: editForm.method,
          note: editForm.note || null,
          reason: editReason.trim(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || "Xatolik"); return; }
      toast.success("To'lov tahrirlandi");
      setEditTarget(null);
      fetchPayments();
      fetchSummary();
    } catch {
      toast.error("Tahrirlashda xatolik");
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">To&apos;lovlar</h1>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => { setPickedStudent(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Yangi to&apos;lov
            </button>
          </div>
        </div>

        {/* Summary Cards — barcha raqamlar server hisoblaydi (butun filial, aniq) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Umumiy tushum</p>
                <p className="text-xl font-bold text-slate-900">
                  {summary ? `${formatAmount(summary.totalIncome)} so'm` : '…'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Bugungi tushum</p>
                <p className="text-xl font-bold text-slate-900">
                  {summary ? `${formatAmount(summary.todayIncome)} so'm` : '…'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Bu oy to&apos;lagan</p>
                <p className="text-xl font-bold text-slate-900">
                  {summary ? `${summary.paidThisMonth} ta` : '…'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <UserX className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Bu oy to&apos;lamagan</p>
                <p className="text-xl font-bold text-slate-900">
                  {summary ? `${summary.unpaidThisMonth} ta` : '…'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Qarzdorlar (balans)</p>
                <p className="text-xl font-bold text-slate-900">
                  {summary ? `${summary.debtorCount} ta` : '…'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    O&apos;quvchi
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Summa
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Oy
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Usul
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Izoh
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Sana
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    Amallar
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {Array.from({ length: 7 }).map((_, c) => (
                        <td key={c} className="px-4 py-3.5"><Skeleton className="h-4 w-full max-w-[120px]" /></td>
                      ))}
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-400"
                    >
                      Bu oy uchun to&apos;lovlar topilmadi
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {payment.student?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">
                        {formatAmount(payment.amount)} so&apos;m
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {payment.month}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {getMethodIcon(payment.method)}
                          {getMethodLabel(payment.method)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {payment.note || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {fmtDate(payment.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(payment)}
                            title="Tahrirlash"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDelete(payment)}
                            disabled={deleting === payment.id}
                            title="O'chirish"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Yangi to&apos;lov
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Student Select */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  O&apos;quvchi
                </label>
                <StudentSearchSelect
                  value={form.studentId}
                  selectedName={pickedStudent?.name}
                  autoFocus
                  onSelect={(s) => {
                    setPickedStudent(s);
                    setForm({ ...form, studentId: s?.id || "" });
                  }}
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Summa (so&apos;m)
                </label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: e.target.value })
                  }
                  required
                  min={1}
                  placeholder="500000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Month */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Oy
                </label>
                <select
                  value={form.month}
                  onChange={(e) =>
                    setForm({ ...form, month: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Method */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  To&apos;lov usuli
                </label>
                <select
                  value={form.method}
                  onChange={(e) =>
                    setForm({ ...form, method: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cash">Naqd</option>
                  <option value="card">Karta</option>
                  <option value="transfer">O&apos;tkazma</option>
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Izoh
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) =>
                    setForm({ ...form, note: e.target.value })
                  }
                  rows={2}
                  placeholder="Qo'shimcha izoh..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tahrirlash modali (majburiy izoh + audit) */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">To&apos;lovni tahrirlash</h2>
              <button onClick={() => setEditTarget(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitEdit} className="p-6 space-y-4">
              <p className="text-sm text-slate-500">{editTarget.student?.name}</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Summa (so&apos;m)</label>
                <input type="number" min="1000" step="1000" value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Oy</label>
                  <select value={editForm.month} onChange={(e) => setEditForm({ ...editForm, month: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {monthOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Usul</label>
                  <select value={editForm.method} onChange={(e) => setEditForm({ ...editForm, method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="cash">Naqd</option>
                    <option value="card">Karta</option>
                    <option value="transfer">O&apos;tkazma</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Izoh (to&apos;lovga)</label>
                <input type="text" value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ixtiyoriy" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">O&apos;zgartirish sababi <span className="text-red-500">*</span></label>
                <textarea required value={editReason} onChange={(e) => setEditReason(e.target.value)}
                  rows={2} placeholder="Nega tahrirlanmoqda? (auditga yoziladi)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Bekor qilish</button>
                <button type="submit" disabled={editSubmitting}
                  className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                  {editSubmitting ? "Saqlanmoqda..." : "Saqlash"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* O'chirish modali (majburiy izoh + audit) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">To&apos;lovni o&apos;chirish</h2>
              <button onClick={() => setDeleteTarget(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{deleteTarget.student?.name}</span> — {formatAmount(Math.abs(deleteTarget.amount))} so&apos;m ({deleteTarget.month}) to&apos;lovi o&apos;chiriladi. Bu amalni orqaga qaytarib bo&apos;lmaydi.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">O&apos;chirish sababi <span className="text-red-500">*</span></label>
                <textarea value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)}
                  rows={2} placeholder="Nega o'chirilmoqda? (auditga yoziladi)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Bekor qilish</button>
                <button type="button" onClick={submitDelete} disabled={deleting === deleteTarget.id}
                  className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
                  {deleting === deleteTarget.id ? "O'chirilmoqda..." : "O'chirish"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
