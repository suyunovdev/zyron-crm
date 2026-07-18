'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { GraduationCap, Menu, X, LogOut, ChevronDown, Settings, Search, Users, UserPlus, FolderOpen, Moon, Sun, Calendar, Loader2, Banknote, CreditCard, ArrowRightLeft, BarChart3, UserCheck, UserX, Snowflake, Archive, BookOpen, ChevronUp, Download } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  action?: string;
}

interface SessionUser {
  id: string;
  name: string;
  login: string;
  role: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  roleLabel: string;
  roleColor: string;
}

// ─── Report Modal Types ───
type ReportCategory = 'finance' | 'student' | 'course' | 'teacher' | 'attendance';

const REPORT_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'finance', label: 'Finance' },
  { value: 'student', label: "O'quvchi" },
  { value: 'course', label: 'Kurs' },
  { value: 'teacher', label: "O'qituvchi" },
  { value: 'attendance', label: 'Davomat' },
];

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatAmount(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// ─── Report Modal Component ───
function ReportModal({ open, onClose, theme }: { open: boolean; onClose: () => void; theme: string }) {
  const [month, setMonth] = useState(getDefaultMonth);
  const [category, setCategory] = useState<ReportCategory>('finance');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const fetchData = async () => {
      try {
        const [statsRes, paymentsRes, groupsRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch(`/api/admin/payments?month=${month}`),
          fetch('/api/admin/groups'),
        ]);
        const stats = statsRes.ok ? await statsRes.json() : {};
        const paymentsJson = paymentsRes.ok ? await paymentsRes.json() : [];
        const payments = Array.isArray(paymentsJson) ? paymentsJson : paymentsJson.payments ?? [];
        const groupsJson = groupsRes.ok ? await groupsRes.json() : [];
        const groups = Array.isArray(groupsJson) ? groupsJson : groupsJson.groups ?? [];
        setData({ stats, payments, groups });
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, [open, month]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!open) return null;

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-[#1e293b]' : 'bg-white';
  const borderColor = isDark ? 'border-[#334155]' : 'border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-[#0f172a] border-[#334155] text-slate-100' : 'bg-white border-slate-200 text-slate-800';

  // Finance data
  const paymentBreakdown = () => {
    if (!data?.payments) return { total: 0, cash: 0, card: 0, transfer: 0 };
    let cash = 0, card = 0, transfer = 0;
    data.payments.forEach((p: any) => {
      const amount = Number(p.amount) || 0;
      const method = (p.method ?? 'cash').toLowerCase();
      if (method === 'card') card += amount;
      else if (method === 'transfer') transfer += amount;
      else cash += amount;
    });
    return { total: cash + card + transfer, cash, card, transfer };
  };

  // Attendance data per group
  const attendanceByGroup = () => {
    if (!data?.groups) return [];
    return data.groups.map((g: any) => {
      const studentCount = g._count?.students ?? 0;
      const lessonCount = g._count?.lessons ?? 0;
      const present = g._count?.presentAttendance ?? 0;
      const absent = g._count?.absentAttendance ?? 0;
      const total = present + absent;
      return {
        id: g.id, name: g.name, studentCount, lessonCount, present, absent,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#2660A4]" />
          <span className={`ml-2 text-sm ${textSecondary}`}>Yuklanmoqda...</span>
        </div>
      );
    }

    if (!data) return <div className={`text-center py-12 text-sm ${textSecondary}`}>Ma&apos;lumot topilmadi</div>;

    switch (category) {
      case 'finance': {
        const pb = paymentBreakdown();
        return (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-emerald-900/30 border-emerald-800' : 'bg-emerald-50 border-emerald-100'}`}>
              <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'} mb-1`}>Jami yig&apos;ilgan</p>
              <p className={`text-3xl font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{formatAmount(pb.total)} so&apos;m</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Naqd', amount: pb.cash, icon: Banknote, color: 'emerald' },
                { label: 'Karta', amount: pb.card, icon: CreditCard, color: 'blue' },
                { label: "O'tkazma", amount: pb.transfer, icon: ArrowRightLeft, color: 'purple' },
              ].map(item => (
                <div key={item.label} className={`p-3 rounded-lg border ${borderColor} ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${isDark ? `bg-${item.color}-900/50` : `bg-${item.color}-100`}`}>
                    <item.icon className={`w-4 h-4 ${isDark ? `text-${item.color}-400` : `text-${item.color}-600`}`} />
                  </div>
                  <p className={`text-[10px] ${textSecondary}`}>{item.label}</p>
                  <p className={`text-sm font-bold ${textPrimary}`}>{formatAmount(item.amount)}</p>
                </div>
              ))}
            </div>
            {data.stats && (
              <div className={`p-3 rounded-lg border ${borderColor} ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'} flex items-center justify-between`}>
                <span className={`text-sm ${textSecondary}`}>Qarzdorlar</span>
                <span className="text-sm font-bold text-red-500">{data.stats.qarzdorlar ?? 0} nafar ({data.stats.qarzdorlarPercent ?? 0}%)</span>
              </div>
            )}
          </div>
        );
      }

      case 'student': {
        const s = data.stats || {};
        const total = (s.activeStudents ?? 0) + (s.frozenStudents ?? 0) + (s.archivedStudents ?? 0);
        return (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${borderColor} ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'} text-center`}>
              <p className={`text-xs ${textSecondary} mb-1`}>Jami o&apos;quvchilar</p>
              <p className={`text-4xl font-bold ${textPrimary}`}>{total}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Faol', count: s.activeStudents ?? 0, icon: UserCheck, bg: 'emerald' },
                { label: 'Muzlatilgan', count: s.frozenStudents ?? 0, icon: Snowflake, bg: 'blue' },
                { label: 'Arxivlangan', count: s.archivedStudents ?? 0, icon: Archive, bg: 'slate' },
              ].map(item => (
                <div key={item.label} className={`p-4 rounded-lg border text-center ${
                  isDark
                    ? `bg-${item.bg}-900/20 border-${item.bg}-800/50`
                    : `bg-${item.bg}-50 border-${item.bg}-100`
                }`}>
                  <item.icon className={`w-5 h-5 mx-auto mb-2 ${isDark ? `text-${item.bg}-400` : `text-${item.bg}-600`}`} />
                  <p className={`text-2xl font-bold ${isDark ? `text-${item.bg}-300` : `text-${item.bg}-700`}`}>{item.count}</p>
                  <p className={`text-[10px] mt-1 ${isDark ? `text-${item.bg}-400` : `text-${item.bg}-600`}`}>{item.label}</p>
                </div>
              ))}
            </div>
            {total > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className={textSecondary}>Faollik darajasi</span>
                  <span className={`font-bold ${textPrimary}`}>{Math.round(((s.activeStudents ?? 0) / total) * 100)}%</span>
                </div>
                <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-[#334155]' : 'bg-slate-100'}`}>
                  <div className="h-full flex">
                    <div className="bg-emerald-500 transition-all" style={{ width: `${((s.activeStudents ?? 0) / total) * 100}%` }} />
                    <div className="bg-blue-400 transition-all" style={{ width: `${((s.frozenStudents ?? 0) / total) * 100}%` }} />
                    <div className="bg-slate-400 transition-all" style={{ width: `${((s.archivedStudents ?? 0) / total) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'course': {
        const groups = data.groups || [];
        const active = groups.filter((g: any) => g.status === 'active');
        const archived = groups.filter((g: any) => g.status === 'archived');
        const totalStudents = active.reduce((s: number, g: any) => s + (g._count?.students ?? 0), 0);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg border ${borderColor} ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'} text-center`}>
                <p className={`text-2xl font-bold ${textPrimary}`}>{groups.length}</p>
                <p className={`text-[10px] ${textSecondary}`}>Jami guruhlar</p>
              </div>
              <div className={`p-3 rounded-lg border ${isDark ? 'border-emerald-800/50 bg-emerald-900/20' : 'border-emerald-100 bg-emerald-50'} text-center`}>
                <p className={`text-2xl font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{active.length}</p>
                <p className={`text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Faol</p>
              </div>
              <div className={`p-3 rounded-lg border ${borderColor} ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'} text-center`}>
                <p className={`text-2xl font-bold ${textPrimary}`}>{totalStudents}</p>
                <p className={`text-[10px] ${textSecondary}`}>O&apos;quvchilar</p>
              </div>
            </div>
            <div className={`rounded-lg border ${borderColor} overflow-hidden`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}>
                    <th className={`text-left py-2.5 px-3 text-xs font-medium ${textSecondary}`}>Guruh</th>
                    <th className={`text-center py-2.5 px-3 text-xs font-medium ${textSecondary}`}>Holat</th>
                    <th className={`text-center py-2.5 px-3 text-xs font-medium ${textSecondary}`}>O&apos;quv.</th>
                    <th className={`text-center py-2.5 px-3 text-xs font-medium ${textSecondary}`}>Darslar</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.slice(0, 10).map((g: any) => (
                    <tr key={g.id} className={`border-t ${borderColor}`}>
                      <td className={`py-2 px-3 font-medium ${textPrimary}`}>{g.name}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          g.status === 'active'
                            ? isDark ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                            : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                        }`}>{g.status === 'active' ? 'Faol' : 'Arxiv'}</span>
                      </td>
                      <td className={`py-2 px-3 text-center ${textSecondary}`}>{g._count?.students ?? 0}</td>
                      <td className={`py-2 px-3 text-center ${textSecondary}`}>{g._count?.lessons ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'teacher': {
        const s = data.stats || {};
        const groups = data.groups || [];
        // Group by teacher
        const teacherMap: Record<string, { name: string; groups: string[]; students: number }> = {};
        groups.forEach((g: any) => {
          if (!g.teacher) return;
          if (!teacherMap[g.teacher.id]) {
            teacherMap[g.teacher.id] = { name: g.teacher.name, groups: [], students: 0 };
          }
          teacherMap[g.teacher.id].groups.push(g.name);
          teacherMap[g.teacher.id].students += g._count?.students ?? 0;
        });
        const teachers = Object.values(teacherMap);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-lg border ${borderColor} ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'} text-center`}>
                <p className={`text-3xl font-bold ${textPrimary}`}>{s.totalTeachers ?? 0}</p>
                <p className={`text-xs ${textSecondary} mt-1`}>Jami o&apos;qituvchilar</p>
              </div>
              <div className={`p-4 rounded-lg border ${isDark ? 'border-emerald-800/50 bg-emerald-900/20' : 'border-emerald-100 bg-emerald-50'} text-center`}>
                <p className={`text-3xl font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{s.activeTeachers ?? 0}</p>
                <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'} mt-1`}>Faol</p>
              </div>
            </div>
            <div className={`rounded-lg border ${borderColor} overflow-hidden`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}>
                    <th className={`text-left py-2.5 px-3 text-xs font-medium ${textSecondary}`}>O&apos;qituvchi</th>
                    <th className={`text-center py-2.5 px-3 text-xs font-medium ${textSecondary}`}>Guruhlar</th>
                    <th className={`text-center py-2.5 px-3 text-xs font-medium ${textSecondary}`}>O&apos;quv.</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t, i) => (
                    <tr key={i} className={`border-t ${borderColor}`}>
                      <td className={`py-2 px-3 font-medium ${textPrimary}`}>{t.name}</td>
                      <td className={`py-2 px-3 text-center ${textSecondary}`}>{t.groups.length}</td>
                      <td className={`py-2 px-3 text-center ${textSecondary}`}>{t.students}</td>
                    </tr>
                  ))}
                  {teachers.length === 0 && (
                    <tr><td colSpan={3} className={`py-6 text-center text-sm ${textSecondary}`}>Ma&apos;lumot yo&apos;q</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'attendance': {
        const rows = attendanceByGroup();
        return (
          <div className="space-y-4">
            {rows.length === 0 ? (
              <div className={`text-center py-12 text-sm ${textSecondary}`}>Ma&apos;lumot topilmadi</div>
            ) : (
              <div className={`rounded-lg border ${borderColor} overflow-hidden`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}>
                      <th className={`text-left py-2.5 px-3 text-xs font-medium ${textSecondary}`}>Guruh</th>
                      <th className={`text-center py-2.5 px-3 text-xs font-medium ${textSecondary}`}>Keldi</th>
                      <th className={`text-center py-2.5 px-3 text-xs font-medium ${textSecondary}`}>Kelmadi</th>
                      <th className={`text-center py-2.5 px-3 text-xs font-medium ${textSecondary}`}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row: any) => (
                      <tr key={row.id} className={`border-t ${borderColor}`}>
                        <td className={`py-2 px-3 font-medium ${textPrimary}`}>{row.name}</td>
                        <td className="py-2 px-3 text-center text-emerald-500 font-medium">{row.present}</td>
                        <td className="py-2 px-3 text-center text-red-500 font-medium">{row.absent}</td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className={`w-12 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#334155]' : 'bg-slate-100'}`}>
                              <div className={`h-full rounded-full ${
                                row.percentage >= 80 ? 'bg-emerald-500' : row.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`} style={{ width: `${row.percentage}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${textPrimary}`}>{row.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
    }
  };

  const selectedLabel = REPORT_CATEGORIES.find(c => c.value === category)?.label ?? '';

  const downloadReport = () => {
    if (!data) return;
    let csvContent = '';
    const monthLabel = month;

    switch (category) {
      case 'finance': {
        const pb = paymentBreakdown();
        csvContent = `Oylik moliyaviy hisobot - ${monthLabel}\n\n`;
        csvContent += `Turi,Summa (so'm)\n`;
        csvContent += `Jami,${pb.total}\n`;
        csvContent += `Naqd,${pb.cash}\n`;
        csvContent += `Karta,${pb.card}\n`;
        csvContent += `O'tkazma,${pb.transfer}\n`;
        csvContent += `\nQarzdorlar,${data.stats?.qarzdorlar ?? 0} nafar\n`;
        csvContent += `Qarzdorlar %,${data.stats?.qarzdorlarPercent ?? 0}%\n`;
        break;
      }
      case 'student': {
        const s = data.stats || {};
        const total = (s.activeStudents ?? 0) + (s.frozenStudents ?? 0) + (s.archivedStudents ?? 0);
        csvContent = `O'quvchilar hisoboti - ${monthLabel}\n\n`;
        csvContent += `Holat,Soni\n`;
        csvContent += `Jami,${total}\n`;
        csvContent += `Faol,${s.activeStudents ?? 0}\n`;
        csvContent += `Muzlatilgan,${s.frozenStudents ?? 0}\n`;
        csvContent += `Arxivlangan,${s.archivedStudents ?? 0}\n`;
        csvContent += `Faollik %,${total > 0 ? Math.round(((s.activeStudents ?? 0) / total) * 100) : 0}%\n`;
        break;
      }
      case 'course': {
        const groups = data.groups || [];
        csvContent = `Kurslar hisoboti - ${monthLabel}\n\n`;
        csvContent += `Guruh,Holat,O'quvchilar,Darslar\n`;
        groups.forEach((g: any) => {
          csvContent += `${g.name},${g.status === 'active' ? 'Faol' : 'Arxiv'},${g._count?.students ?? 0},${g._count?.lessons ?? 0}\n`;
        });
        break;
      }
      case 'teacher': {
        const groups = data.groups || [];
        const teacherMap: Record<string, { name: string; groups: string[]; students: number }> = {};
        groups.forEach((g: any) => {
          if (!g.teacher) return;
          if (!teacherMap[g.teacher.id]) teacherMap[g.teacher.id] = { name: g.teacher.name, groups: [], students: 0 };
          teacherMap[g.teacher.id].groups.push(g.name);
          teacherMap[g.teacher.id].students += g._count?.students ?? 0;
        });
        csvContent = `O'qituvchilar hisoboti - ${monthLabel}\n\n`;
        csvContent += `O'qituvchi,Guruhlar soni,O'quvchilar soni,Guruhlar\n`;
        Object.values(teacherMap).forEach(t => {
          csvContent += `${t.name},${t.groups.length},${t.students},"${t.groups.join(', ')}"\n`;
        });
        break;
      }
      case 'attendance': {
        const rows = attendanceByGroup();
        csvContent = `Davomat hisoboti - ${monthLabel}\n\n`;
        csvContent += `Guruh,Keldi,Kelmadi,Davomat %\n`;
        rows.forEach((row: any) => {
          csvContent += `${row.name},${row.present},${row.absent},${row.percentage}%\n`;
        });
        break;
      }
    }

    // BOM for UTF-8 support in Excel
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hisobot-${category}-${monthLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl border ${cardBg} ${borderColor} max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${borderColor}`}>
          <h2 className={`text-xl font-bold ${textPrimary}`}>Oylik hisobot</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-[#334155]' : 'hover:bg-slate-100'}`}>
            <X className={`w-5 h-5 ${textSecondary}`} />
          </button>
        </div>

        {/* Filters */}
        <div className={`flex items-center gap-3 px-6 py-4 border-b ${borderColor}`}>
          <div className="relative flex-1">
            <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} />
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className={`w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2660A4]/30 ${inputBg}`}
            />
          </div>
          <div ref={dropdownRef} className="relative flex-1">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2660A4]/30 ${inputBg} ${
                dropdownOpen ? 'ring-2 ring-[#2660A4]/30' : ''
              }`}
            >
              <span className={category === 'finance' ? 'text-[#2660A4] font-semibold' : ''}>{selectedLabel}</span>
              {dropdownOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {dropdownOpen && (
              <div className={`absolute top-full mt-1 left-0 right-0 rounded-lg shadow-xl border z-50 py-1 ${cardBg} ${borderColor}`}>
                {REPORT_CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => { setCategory(c.value); setDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      category === c.value
                        ? 'text-[#2660A4] font-semibold'
                        : `${textPrimary} ${isDark ? 'hover:bg-[#334155]' : 'hover:bg-slate-50'}`
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {renderContent()}
        </div>

        {/* Footer - Download */}
        {!loading && data && (
          <div className={`flex items-center justify-end px-6 py-3 border-t ${borderColor}`}>
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2660A4] text-white text-sm font-medium hover:bg-[#1d4e87] transition-colors"
            >
              <Download className="w-4 h-4" />
              Yuklab olish (CSV)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Layout ───
export default function DashboardLayout({ children, navItems, roleLabel, roleColor }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ students: any[]; teachers: any[]; groups: any[] } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hasSidebar = navItems.length > 0;

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) setUser(data.user);
        else router.push('/login');
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (q.trim().length < 2) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setSearchOpen(true);
        }
      } catch { /* ignore */ }
    }, 300);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (!(e.target as HTMLElement).closest('[data-profile-dropdown]')) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (item: NavItem, e: React.MouseEvent) => {
    if (item.action === 'report-modal') {
      e.preventDefault();
      setReportModalOpen(true);
      setSidebarOpen(false);
    }
  };

  if (!user) return null;

  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-[#0b1120]' : 'bg-[#f8f9fb]'}`}>
      {/* ──── Sidebar - Desktop (only if navItems exist) ──── */}
      {hasSidebar && (
        <aside className={`hidden md:flex w-[88px] flex-col fixed inset-y-0 left-0 z-30 border-r ${
          theme === 'dark'
            ? 'bg-[#0f172a] border-[#1e293b]'
            : 'bg-white border-slate-200'
        }`}>
          {/* Logo */}
          <div className={`py-3 flex items-center justify-center border-b ${
            theme === 'dark' ? 'border-[#1e293b]' : 'border-slate-200'
          }`}>
            <Link href="/">
              <Image src="/logo-vertical.png" alt="Aka-Uka" width={60} height={60} className="object-contain" />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.action ? '#' : item.href}
                  onClick={(e) => handleNavClick(item, e)}
                  className={`flex flex-col items-center gap-1 py-2.5 mx-1.5 rounded-xl text-center transition-all ${
                    isActive && !item.action
                      ? theme === 'dark'
                        ? 'bg-[#2660A4] text-white'
                        : 'bg-[#2660A4] text-white'
                      : theme === 'dark'
                        ? 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
                        : 'text-[#2660A4] hover:bg-[#2660A4]/10'
                  }`}
                >
                  <item.icon className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Version & Status */}
          <div className={`py-3 px-2 border-t text-center ${
            theme === 'dark' ? 'border-[#1e293b]' : 'border-slate-200'
          }`}>
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <span className="w-2 h-2 bg-[#22AA79] rounded-full animate-pulse" />
              <span className="text-[9px] font-medium text-[#22AA79]">Online</span>
            </div>
            <p className={`text-[9px] mb-2 ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>v1.0.0</p>
            <div className="flex items-center justify-center gap-1">
              <Image src="/zyron-mark.svg" alt="Zyron" width={14} height={14} />
              <span className={`text-[8px] font-medium ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>Zyron</span>
            </div>
          </div>
        </aside>
      )}

      {/* ──── Mobile sidebar overlay (only if navItems exist) ──── */}
      {hasSidebar && sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#0f1b2d] flex flex-col animate-slide-in">
            <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Image src="/logo-horizontal-white.png" alt="Aka-Uka" width={120} height={36} className="object-contain" />
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.action ? '#' : item.href}
                    onClick={(e) => {
                      handleNavClick(item, e);
                      if (!item.action) setSidebarOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all relative ${
                      isActive && !item.action
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {isActive && !item.action && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-blue-500 rounded-r" />
                    )}
                    <item.icon className={`w-[18px] h-[18px] ${isActive && !item.action ? 'text-blue-400' : ''}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ──── Main content ──── */}
      <div className={`flex-1 flex flex-col h-screen min-w-0 overflow-hidden ${hasSidebar ? 'md:ml-[88px]' : ''}`}>
        {/* Top bar */}
        <header className={`flex-shrink-0 z-20 h-14 flex items-center justify-between px-4 lg:px-6 ${
          theme === 'dark' ? 'bg-[#1a3a6a] border-b border-[#2660A4]/30' : 'bg-[#2660A4]'
        }`}>
          {/* Mobile menu (only if sidebar exists) */}
          {hasSidebar ? (
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Menu className="w-5 h-5 text-white" />
            </button>
          ) : (
            <Link href="/">
              <Image src="/logo-horizontal-white.png" alt="Aka-Uka" width={120} height={36} className="object-contain" />
            </Link>
          )}

          {/* Global search (admin only) */}
          {user.role === 'admin' && (
            <div ref={searchRef} className="hidden sm:block relative flex-1 max-w-md mx-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults && setSearchOpen(true)}
                placeholder="Qidirish... (o'quvchi, o'qituvchi, guruh)"
                className="w-full bg-white/10 text-white placeholder-white/50 text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-white/15 transition-colors"
              />
              {searchOpen && searchResults && (
                <div className={`absolute top-full mt-2 left-0 right-0 rounded-xl shadow-2xl border overflow-hidden z-50 max-h-[400px] overflow-y-auto ${
                  theme === 'dark' ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-slate-200'
                }`}>
                  {searchResults.students.length === 0 && searchResults.teachers.length === 0 && searchResults.groups.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Natija topilmadi</p>
                  ) : (
                    <>
                      {searchResults.students.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" /> O&apos;quvchilar
                            </p>
                          </div>
                          {searchResults.students.map((s: any) => (
                            <Link
                              key={s.id}
                              href="/dashboard/admin/students"
                              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors"
                            >
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-600">
                                  {s.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{s.name}</p>
                                <p className="text-xs text-slate-400">{s.login} {s.phone && `• ${s.phone}`}</p>
                              </div>
                              {s.status && (
                                <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  s.status === 'active' ? 'bg-green-100 text-green-700' :
                                  s.status === 'frozen' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  {s.status === 'active' ? 'Faol' : s.status === 'frozen' ? 'Muzlatilgan' : 'Arxiv'}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchResults.teachers.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                              <UserPlus className="w-3.5 h-3.5" /> O&apos;qituvchilar
                            </p>
                          </div>
                          {searchResults.teachers.map((t: any) => (
                            <Link
                              key={t.id}
                              href="/dashboard/admin/teachers"
                              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors"
                            >
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-xs font-bold text-purple-600">
                                  {t.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{t.name}</p>
                                <p className="text-xs text-slate-400">{t.login} {t.phone && `• ${t.phone}`}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      {searchResults.groups.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                              <FolderOpen className="w-3.5 h-3.5" /> Guruhlar
                            </p>
                          </div>
                          {searchResults.groups.map((g: any) => (
                            <Link
                              key={g.id}
                              href="/dashboard/admin/groups"
                              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors"
                            >
                              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                <FolderOpen className="w-4 h-4 text-amber-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{g.name}</p>
                                <p className="text-xs text-slate-400">{g.subject} • {g._count?.students ?? 0} o&apos;quvchi</p>
                              </div>
                              <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {g.status === 'active' ? 'Faol' : 'Arxiv'}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Left spacer on desktop (only with sidebar, no search) */}
          {hasSidebar && user.role !== 'admin' && <div className="hidden md:block flex-1" />}

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={theme === 'light' ? 'Tungi rejim' : 'Kunduzgi rejim'}
            >
              {theme === 'light' ? (
                <Moon className="w-4.5 h-4.5 text-white/70" />
              ) : (
                <Sun className="w-4.5 h-4.5 text-yellow-300" />
              )}
            </button>
            <span className={`px-2.5 py-1 rounded text-[11px] font-semibold ${roleColor}`}>
              {roleLabel}
            </span>

            <div className="relative" data-profile-dropdown>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 hover:bg-white/10 rounded-lg px-2.5 py-1.5 transition-colors"
              >
                <div className="w-8 h-8 bg-[#22AA79] rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{initials}</span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-white leading-tight">{user.name}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/50 hidden sm:block" />
              </button>

              {profileOpen && (
                <div className={`absolute right-0 top-full mt-2 w-52 rounded-lg shadow-xl border py-1.5 z-50 ${
                  theme === 'dark' ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-slate-200'
                }`}>
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.login}</p>
                  </div>
                  <Link
                    href={`/dashboard/${user.role}/settings`}
                    onClick={() => setProfileOpen(false)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" /> Sozlamalar
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Chiqish
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 min-h-0 overflow-auto p-4 lg:p-6 ${
          theme === 'dark' ? 'bg-[#0b1120]' : ''
        }`}>
          {children}
        </main>
      </div>

      {/* Report Modal */}
      <ReportModal open={reportModalOpen} onClose={() => setReportModalOpen(false)} theme={theme} />
    </div>
  );
}
