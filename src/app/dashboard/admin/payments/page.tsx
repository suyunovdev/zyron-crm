"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";

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
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/admin/users?role=student&limit=500");
      if (res.ok) {
        const resp = await res.json();
        setStudents(Array.isArray(resp) ? resp : (resp.data || []));
      }
    } catch {
      console.error("O'quvchilarni yuklashda xatolik");
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const totalForMonth = payments.reduce((sum, p) => sum + p.amount, 0);

  const tn = tzNow();
  const today = `${tn.getFullYear()}-${String(tn.getMonth() + 1).padStart(2, '0')}-${String(tn.getDate()).padStart(2, '0')}`;
  const todayPayments = payments.filter(
    (p) => p.createdAt.split("T")[0] === today
  );
  const todayTotal = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  const paidStudentIds = new Set(payments.map((p) => p.studentId));
  const debtorsCount = students.filter((s) => !paidStudentIds.has(s.id)).length;

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
        setForm({
          studentId: "",
          amount: "",
          month: getCurrentMonth(),
          method: "cash",
          note: "",
        });
        fetchPayments();
      }
    } catch {
      console.error("To'lov yaratishda xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu to'lovni o'chirmoqchimisiz?")) return;

    setDeleting(id);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        fetchPayments();
      }
    } catch {
      console.error("To'lovni o'chirishda xatolik");
    } finally {
      setDeleting(null);
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
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Yangi to&apos;lov
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Umumiy tushum</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatAmount(totalForMonth)} so&apos;m
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
                  {formatAmount(todayTotal)} so&apos;m
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
                <p className="text-sm text-slate-500">Qarzdorlar</p>
                <p className="text-xl font-bold text-slate-900">
                  {debtorsCount} ta
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
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-400"
                    >
                      Yuklanmoqda...
                    </td>
                  </tr>
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
                  payments.map((payment) => (
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
                        {new Date(payment.createdAt).toLocaleDateString("uz-UZ")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(payment.id)}
                          disabled={deleting === payment.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                <select
                  value={form.studentId}
                  onChange={(e) =>
                    setForm({ ...form, studentId: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">O&apos;quvchini tanlang</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
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
    </>
  );
}
