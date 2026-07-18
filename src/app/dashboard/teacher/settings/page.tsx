'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { teacherNav } from '@/lib/nav';
import {
  Users,
  BookOpen,
  CalendarDays,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface SessionUser {
  id: string;
  name: string;
  login: string;
  role: string;
}

interface Attendance {
  id: string;
  present: boolean;
}

interface Lesson {
  id: string;
  scheduledDate: string;
  attendances: Attendance[];
}

interface Group {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  lessons: Lesson[];
  _count: {
    students: number;
    lessons: number;
  };
}

export default function TeacherSettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
      fetch('/api/teacher/groups').then(r => r.ok ? r.json() : []),
    ]).then(([userData, groupsData]) => {
      if (userData?.user) setUser(userData.user);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalStudents = groups.reduce((s, g) => s + g._count.students, 0);
  const totalLessons = groups.reduce((s, g) => s + g._count.lessons, 0);

  // Overall attendance rate
  let totalPresent = 0;
  let totalMarked = 0;
  groups.forEach(g => {
    g.lessons.forEach(l => {
      l.attendances.forEach(a => {
        totalMarked++;
        if (a.present) totalPresent++;
      });
    });
  });
  const attendanceRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

  // Per-group attendance
  function groupAttendance(group: Group) {
    let present = 0;
    let marked = 0;
    group.lessons.forEach(l => {
      l.attendances.forEach(a => {
        marked++;
        if (a.present) present++;
      });
    });
    return marked > 0 ? Math.round((present / marked) * 100) : 0;
  }

  const now = new Date();
  const monthNames = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
  ];

  return (
    <DashboardLayout
      navItems={teacherNav}
      roleLabel="O'qituvchi"
      roleColor="bg-emerald-100 text-emerald-700"
    >
      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Yuklanmoqda...</div>
      ) : (
        <div className="space-y-6">
          {/* ── Header: Name + month ── */}
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold text-slate-900">{user?.name || 'Profil'}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 border border-slate-200 rounded-lg px-3 py-2 bg-white">
              <CalendarDays className="w-4 h-4" />
              {now.getFullYear()}-{monthNames[now.getMonth()]}
            </div>
          </div>

          {/* ── Stat cards row ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Guruhlar */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 font-medium">Guruhlar</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{groups.length}</p>
            </div>
            {/* Davomat o'rtachasi */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 font-medium">
                Davomat <span className="text-slate-400">o&apos;rtacha</span>
              </p>
              <p className={`text-2xl font-bold mt-1 ${
                attendanceRate >= 80 ? 'text-emerald-600' : attendanceRate >= 50 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {attendanceRate}%
              </p>
            </div>
            {/* Jami o'quvchilar */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 font-medium">Jami o&apos;quvchilar</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{totalStudents}</p>
            </div>
            {/* Jami darslar */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 font-medium">Jami darslar</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{totalLessons}</p>
            </div>
          </div>

          {/* ── Groups section ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                Groups <span className="text-slate-400 text-base font-normal">({monthNames[now.getMonth()]})</span>
              </h2>
            </div>

            {groups.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">Guruhlar mavjud emas</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {groups.map(group => {
                  const pct = groupAttendance(group);
                  return (
                    <Link
                      key={group.id}
                      href="/dashboard/teacher/groups"
                      className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        {/* Dot */}
                        <span className="w-2.5 h-2.5 bg-red-400 rounded-full flex-shrink-0" />
                        {/* Group name + badge */}
                        <span className="text-sm font-semibold text-slate-800">{group.name}</span>
                        <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {pct}%
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {group._count.students}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                          {group._count.lessons} dars
                        </span>
                        <span className="text-slate-400">{group.subject}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Shaxsiy ma'lumotlar ── */}
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
                  <span className="text-sm font-semibold text-emerald-600">O&apos;qituvchi</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
