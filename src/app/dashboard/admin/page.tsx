'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminNav } from '@/lib/nav';
import {
  Users,
  UserPlus,
  FolderOpen,
  CalendarDays,
  Snowflake,
  Archive,
  TrendingUp,
  ChevronRight,
  BookOpen,
  TrendingDown,
  AlertTriangle,
  UserX,
  Banknote,
  CreditCard,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

function formatAmount(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

interface Stats {
  totalStudents: number;
  activeStudents: number;
  frozenStudents: number;
  archivedStudents: number;
  totalTeachers: number;
  activeTeachers: number;
  totalGroups: number;
  activeGroups: number;
  archivedGroups: number;
  totalLessons: number;
  totalAttendance: number;
  presentAttendance: number;
  konversiya: number;
  totalLeads: number;
  enrolledLeads: number;
  qarzdorlar: number;
  qarzdorlarPercent: number;
  umumiyTushum: number;
  bugungiTushum: number;
  umumiyQarzdorlik: number;
}

interface SessionUser {
  id: string;
  name: string;
  login: string;
  role: string;
}

interface Group {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  status: string;
  maxStudents: number;
  startDate?: string;
  room?: string;
  dayType?: string;
  time?: string;
  teacher: { name: string } | null;
  _count: { students: number; lessons: number };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/admin/groups').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([statsData, userData, groupsData]) => {
      if (statsData && !statsData.error) setStats(statsData);
      if (userData?.user) setUser(userData.user);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const now = new Date();
  const days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const dayName = days[now.getDay()];
  const dateStr = `${dayName} · ${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const greeting = now.getHours() < 12 ? 'Xayrli tong' : now.getHours() < 18 ? 'Xayrli kun' : 'Xayrli kech';

  const attendanceRate = stats && stats.totalAttendance > 0
    ? Math.round((stats.presentAttendance / stats.totalAttendance) * 100)
    : 0;

  const activeGroups = groups.filter(g => g.status === 'active');
  const unfilledGroups = activeGroups.filter(g => (g._count?.students ?? 0) < g.maxStudents);

  return (
    <DashboardLayout navItems={adminNav} roleLabel="Admin" roleColor="bg-red-100 text-red-700">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          <span className="ml-2 text-slate-400 text-sm">Yuklanmoqda...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Greeting ── */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontStyle: 'italic' }}>
              {greeting}, {user?.name || 'Admin'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {dateStr} &nbsp; {timeStr}
            </p>
          </div>

          {/* ── Main stat cards 2x2 ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* O'quvchilar soni */}
            <Link href="/dashboard/admin/students" className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Users className="w-4 h-4" />
                  O&apos;quvchilar soni
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {stats?.activeStudents ?? 0}/{stats?.totalStudents ?? 0}
              </p>
              <p className="text-sm text-slate-400 mt-1">Faol / Jami</p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: stats && stats.totalStudents > 0 ? `${(stats.activeStudents / stats.totalStudents) * 100}%` : '0%' }}
                />
              </div>
            </Link>

            {/* Konversiya */}
            <Link href="/dashboard/admin/leads" className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <TrendingUp className="w-4 h-4" />
                  Konversiya
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats?.konversiya ?? 0}%</p>
              <p className="text-sm text-slate-400 mt-1">
                {stats?.enrolledLeads ?? 0} / {stats?.totalLeads ?? 0} lid
              </p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${stats?.konversiya ?? 0}%` }}
                />
              </div>
            </Link>

            {/* Davomat */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                <CalendarDays className="w-4 h-4" />
                Davomat
              </div>
              <p className="text-3xl font-bold text-slate-900">{attendanceRate}%</p>
              <p className="text-sm text-slate-400 mt-1">Umumiy davomat darajasi</p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
            </div>

            {/* Qarzdorlar */}
            <Link href="/dashboard/admin/payments" className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <AlertTriangle className="w-4 h-4" />
                  Qarzdorlar
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="text-3xl font-bold text-slate-900">
                {stats?.qarzdorlar ?? 0} / {stats?.qarzdorlarPercent ?? 0}%
              </p>
              <p className="text-sm text-slate-400 mt-1">Bu oy to&apos;lamagan</p>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all"
                  style={{ width: `${stats?.qarzdorlarPercent ?? 0}%` }}
                />
              </div>
            </Link>
          </div>

          {/* ── Small stat cards row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <UserX className="w-4 h-4" />
                Ketgan o&apos;quvchilar
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats?.archivedStudents ?? 0}</p>
              <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full" style={{ width: stats && stats.totalStudents > 0 ? `${((stats.archivedStudents || 0) / stats.totalStudents) * 100}%` : '0%' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <Snowflake className="w-4 h-4" />
                Muzlatilgan
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats?.frozenStudents ?? 0}</p>
              <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: stats && stats.totalStudents > 0 ? `${((stats.frozenStudents || 0) / stats.totalStudents) * 100}%` : '0%' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <UserPlus className="w-4 h-4" />
                O&apos;qituvchilar
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats?.activeTeachers ?? 0} / {stats?.totalTeachers ?? 0}</p>
              <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <FolderOpen className="w-4 h-4" />
                Guruhlar
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats?.activeGroups ?? 0} / {stats?.totalGroups ?? 0}</p>
              <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: stats && stats.totalGroups > 0 ? `${((stats.activeGroups || 0) / stats.totalGroups) * 100}%` : '0%' }} />
              </div>
            </div>
          </div>

          {/* ── To'ldirilmagan guruhlar ── */}
          {unfilledGroups.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">
                  To&apos;ldirilmagan guruhlar{' '}
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-500 text-white text-xs font-bold rounded-full ml-1">
                    {unfilledGroups.length}
                  </span>
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {unfilledGroups.map(group => (
                  <div key={group.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-600 uppercase">{group.subject}</span>
                      <span className="text-xs text-slate-400">{group.name}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{group.teacher?.name || '—'}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className={`font-bold ${
                        (group._count?.students ?? 0) >= group.maxStudents ? 'text-red-500' : 'text-emerald-600'
                      }`}>
                        <Users className="w-3 h-3 inline mr-0.5" />
                        {group._count?.students ?? 0}/{group.maxStudents}
                      </span>
                      {group.time && <span className="font-semibold">{group.time}</span>}
                      {group.schedule && <span>{group.schedule}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Finance ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Finance</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              {/* Umumiy tushum */}
              <div className="p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Umumiy tushum</p>
                <p className="text-3xl font-bold text-slate-900">{formatAmount(stats?.umumiyTushum ?? 0)}</p>
                <p className="text-sm text-slate-400 mt-1">so&apos;m (bu oy)</p>
              </div>
              {/* Bugungi tushum */}
              <div className="p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bugungi tushum</p>
                <p className="text-3xl font-bold text-slate-900">{formatAmount(stats?.bugungiTushum ?? 0)}</p>
                <Link href="/dashboard/admin/payments" className="text-sm text-amber-600 hover:text-amber-700 font-semibold mt-1 inline-block">
                  Batafsil &rarr;
                </Link>
              </div>
            </div>
            {/* Umumiy qarzdorlik */}
            {(stats?.qarzdorlar ?? 0) > 0 && (
              <div className="px-5 py-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Qarzdor o&apos;quvchilar</p>
                <p className="text-2xl font-bold text-red-600">{stats?.qarzdorlar ?? 0} ta</p>
                <p className="text-sm text-red-400 mt-0.5">Bu oy to&apos;lov qilmagan faol o&apos;quvchilar</p>
              </div>
            )}
          </div>

          {/* ── Active groups section ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Faol guruhlar <span className="text-sm font-normal text-slate-400 ml-1">{activeGroups.length}</span>
              </h2>
              <Link
                href="/dashboard/admin/groups"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Barchasini ko&apos;rish
              </Link>
            </div>

            {activeGroups.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">Faol guruhlar yo&apos;q</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeGroups.slice(0, 8).map(group => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full flex-shrink-0" />
                      <span className="text-sm font-semibold text-slate-800">{group.name}</span>
                      <span className="text-xs text-slate-400">{group.subject}</span>
                    </div>
                    <div className="flex items-center gap-5 text-sm text-slate-500">
                      {group.teacher && (
                        <span className="hidden sm:flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                          {group.teacher.name}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 ${
                        (group._count?.students ?? 0) >= group.maxStudents ? 'text-red-500' : ''
                      }`}>
                        <Users className="w-3.5 h-3.5" />
                        {group._count?.students ?? 0} / {group.maxStudents}
                      </span>
                      {group.room && (
                        <span className="hidden md:block text-xs text-slate-400">{group.room}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
