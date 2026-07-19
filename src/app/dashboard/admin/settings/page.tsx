'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  FolderOpen,
  CalendarDays,
  UserPlus,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface SessionUser {
  id: string;
  name: string;
  login: string;
  role: string;
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
  totalLessons: number;
  totalAttendance: number;
  presentAttendance: number;
}

export default function AdminSettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
      fetch('/api/admin/stats').then(r => r.ok ? r.json() : null),
    ]).then(([userData, statsData]) => {
      if (userData?.user) setUser(userData.user);
      if (statsData) setStats(statsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const now = new Date();
  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
  ];

  const attendanceRate = stats && stats.totalAttendance > 0
    ? Math.round((stats.presentAttendance / stats.totalAttendance) * 100)
    : 0;

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Yuklanmoqda...</div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold text-slate-900">{user?.name || 'Admin'}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 border border-slate-200 rounded-lg px-3 py-2 bg-white">
              <CalendarDays className="w-4 h-4" />
              {now.getFullYear()}-{months[now.getMonth()]}
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 font-medium">O&apos;quvchilar</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats?.activeStudents ?? 0}/{stats?.totalStudents ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 font-medium">
                Davomat <span className="text-slate-400">o&apos;rtacha</span>
              </p>
              <p className={`text-2xl font-bold mt-1 ${
                attendanceRate >= 80 ? 'text-emerald-600' : attendanceRate >= 50 ? 'text-amber-600' : 'text-red-600'
              }`}>{attendanceRate}%</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 font-medium">O&apos;qituvchilar</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.activeTeachers ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 font-medium">Guruhlar</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.activeGroups ?? 0}/{stats?.totalGroups ?? 0}</p>
            </div>
          </div>

          {/* Shaxsiy ma'lumotlar */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Shaxsiy ma&apos;lumotlar</h2>
            </div>
            {user && (
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-slate-500">Ism familya</span>
                  <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-slate-500">Login</span>
                  <span className="text-sm font-semibold text-slate-900">{user.login}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-slate-500">Rol</span>
                  <span className="text-sm font-semibold text-red-600">Administrator</span>
                </div>
              </div>
            )}
          </div>

          {/* Platforma */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Platforma</h2>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-slate-500">Nomi</span>
                <span className="text-sm font-semibold text-slate-900">Aka-Uka Ta&apos;lim Markazi</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-slate-500">Versiya</span>
                <span className="text-sm font-semibold text-slate-900">1.0.0</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-slate-500">Holat</span>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">Faol</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
