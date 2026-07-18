"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { adminNav } from "@/lib/nav";
import {
  Calendar,
  Users,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  BarChart3,
  UserCheck,
  UserX,
  Snowflake,
  Archive,
  Loader2,
} from "lucide-react";

function formatAmount(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function getDefaultMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

interface GroupAttendance {
  groupId: string;
  groupName: string;
  studentCount: number;
  lessonCount: number;
  present: number;
  absent: number;
  percentage: number;
}

interface PaymentBreakdown {
  total: number;
  cash: number;
  card: number;
  transfer: number;
}

interface StudentStatus {
  active: number;
  frozen: number;
  archived: number;
}

export default function ReportsPage() {
  const [month, setMonth] = useState(getDefaultMonth);
  const [loading, setLoading] = useState(true);

  const [attendanceData, setAttendanceData] = useState<GroupAttendance[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentBreakdown>({
    total: 0,
    cash: 0,
    card: 0,
    transfer: 0,
  });
  const [statusData, setStatusData] = useState<StudentStatus>({
    active: 0,
    frozen: 0,
    archived: 0,
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, paymentsRes, statsRes] = await Promise.all([
        fetch("/api/admin/groups"),
        fetch(`/api/admin/payments?month=${month}`),
        fetch("/api/admin/stats"),
      ]);

      // --- Attendance ---
      if (groupsRes.ok) {
        const groupsJson = await groupsRes.json();
        const groups = Array.isArray(groupsJson)
          ? groupsJson
          : groupsJson.groups ?? groupsJson.data ?? [];

        const attendanceRows: GroupAttendance[] = groups.map((g: any) => {
          const studentCount = g._count?.students ?? g.students?.length ?? 0;
          const lessonCount = g._count?.lessons ?? 0;

          // Attendance data isn't included in groups API response,
          // so we estimate from _count if available
          const present = g._count?.presentAttendance ?? 0;
          const absent = g._count?.absentAttendance ?? 0;
          const total = present + absent;

          return {
            groupId: g.id,
            groupName: g.name,
            studentCount,
            lessonCount,
            present,
            absent,
            percentage: total > 0 ? Math.round((present / total) * 100) : 0,
          };
        });
        setAttendanceData(attendanceRows);
      }

      // --- Payments ---
      if (paymentsRes.ok) {
        const paymentsJson = await paymentsRes.json();
        const payments = Array.isArray(paymentsJson)
          ? paymentsJson
          : paymentsJson.payments ?? paymentsJson.data ?? [];

        let cash = 0;
        let card = 0;
        let transfer = 0;

        payments.forEach((p: any) => {
          const amount = Number(p.amount) || 0;
          const method = (p.method ?? p.paymentMethod ?? "cash").toLowerCase();
          if (method === "card") card += amount;
          else if (method === "transfer") transfer += amount;
          else cash += amount;
        });

        setPaymentData({ total: cash + card + transfer, cash, card, transfer });
      }

      // --- Student status ---
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setStatusData({
          active: stats.activeStudents ?? stats.active ?? 0,
          frozen: stats.frozenStudents ?? stats.frozen ?? 0,
          archived: stats.archivedStudents ?? stats.archived ?? 0,
        });
      }
    } catch (err) {
      console.error("Reports fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <DashboardLayout
      navItems={adminNav}
      roleLabel="Admin"
      roleColor="bg-red-100 text-red-700"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Oylik hisobotlar</h1>
            <p className="text-slate-500 text-sm mt-1">
              Davomat, to&apos;lov va o&apos;quvchilar holati
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-slate-500">Yuklanmoqda...</span>
          </div>
        ) : (
          <>
            {/* Davomat hisoboti */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Davomat hisoboti
                </h2>
              </div>

              {attendanceData.length === 0 ? (
                <p className="text-slate-400 text-sm py-4">
                  Bu oy uchun ma&apos;lumot topilmadi
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-4 font-medium text-slate-500">
                          Guruh
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-slate-500">
                          O&apos;quvchilar
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-slate-500">
                          Darslar
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-slate-500">
                          Keldi
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-slate-500">
                          Kelmadi
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-slate-500">
                          Davomat %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.map((row) => (
                        <tr
                          key={row.groupId}
                          className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {row.groupName}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600">
                            {row.studentCount}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600">
                            {row.lessonCount}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-green-600 font-medium">
                              {row.present}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-red-500 font-medium">
                              {row.absent}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    row.percentage >= 80
                                      ? "bg-green-500"
                                      : row.percentage >= 50
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${row.percentage}%` }}
                                />
                              </div>
                              <span className="font-medium text-slate-700 w-10 text-right">
                                {row.percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* To'lov hisoboti */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  To&apos;lov hisoboti
                </h2>
              </div>

              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-sm text-green-600 mb-1">Jami yig&apos;ilgan</p>
                <p className="text-3xl font-bold text-green-700">
                  {formatAmount(paymentData.total)} so&apos;m
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Naqd</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {formatAmount(paymentData.cash)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Karta</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {formatAmount(paymentData.card)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ArrowRightLeft className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">O&apos;tkazma</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {formatAmount(paymentData.transfer)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* O'quvchilar holati */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-violet-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  O&apos;quvchilar holati
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-4 p-5 bg-green-50 rounded-lg border border-green-100">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600">Faol</p>
                    <p className="text-2xl font-bold text-green-700">
                      {statusData.active}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-5 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Snowflake className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600">Muzlatilgan</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {statusData.frozen}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center">
                    <Archive className="w-6 h-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Arxivlangan</p>
                    <p className="text-2xl font-bold text-slate-600">
                      {statusData.archived}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
