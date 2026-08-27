'use client';

import { useState, useEffect } from 'react';
import { Skeleton, SkeletonStatCards, SkeletonTable } from '@/components/skeleton';
import {
  Users, BookOpen, TrendingUp, UserCheck, Phone, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { TodayLessonsCard, type TodayLesson } from '@/components/TodayLessonsCard';

interface SessionUser {
  id: string;
  name: string;
  login: string;
  role: string;
  phone?: string;
  subject?: string;
}

interface Attendance {
  id: string;
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

interface StudentEnrollment {
  student: { id: string; name: string; phone: string; status: string };
}

interface Group {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  time?: string;
  room?: string;
  dayType?: string;
  students: StudentEnrollment[];
  lessons: Lesson[];
  _count: { students: number; lessons: number };
}

function isSameDay(dateStr: string): boolean {
  const str = new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' });
  const today = new Date(str);
  const [y, m, d] = dateStr.split('-').map(Number);
  return today.getFullYear() === y && today.getMonth() + 1 === m && today.getDate() === d;
}

const MONTHS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];
const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

export default function TeacherDashboardPage() {
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

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const totalStudents = groups.reduce((s, g) => s + g._count.students, 0);
  const totalLessons = groups.reduce((s, g) => s + g._count.lessons, 0);

  // Overall attendance
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

  // Today's lessons across all groups
  const todayLessons: { group: Group; lesson: Lesson }[] = [];
  groups.forEach(g => {
    g.lessons.forEach(l => {
      if (isSameDay(l.scheduledDate)) {
        todayLessons.push({ group: g, lesson: l });
      }
    });
  });
  todayLessons.sort((a, b) => a.lesson.scheduledTime.localeCompare(b.lesson.scheduledTime));

  const todayLessonItems: TodayLesson[] = todayLessons.map(({ group, lesson }) => {
    const present = lesson.attendances.filter(a => a.present).length;
    const total = group._count.students;
    return {
      id: lesson.id,
      time: lesson.scheduledTime,
      groupName: group.name,
      subject: group.subject,
      meta: lesson.topic || 'Mavzu kiritilmagan',
      room: group.room || undefined,
      href: '/dashboard/teacher/groups',
      status: lesson.attendances.length === 0
        ? { label: 'Belgilanmagan', tone: 'warn' as const }
        : { label: `${present}/${total} keldi`, tone: 'ok' as const },
    };
  });

  // Upcoming lessons (next 7 days, exclude today)
  const upcoming: { group: Group; lesson: Lesson }[] = [];
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const weekLater = new Date(now);
  weekLater.setDate(weekLater.getDate() + 7);
  const weekLaterStr = `${weekLater.getFullYear()}-${String(weekLater.getMonth() + 1).padStart(2, '0')}-${String(weekLater.getDate()).padStart(2, '0')}`;
  groups.forEach(g => {
    g.lessons.forEach(l => {
      if (l.scheduledDate > todayStr && l.scheduledDate <= weekLaterStr) {
        upcoming.push({ group: g, lesson: l });
      }
    });
  });
  upcoming.sort((a, b) => a.lesson.scheduledDate.localeCompare(b.lesson.scheduledDate) || a.lesson.scheduledTime.localeCompare(b.lesson.scheduledTime));

  // Per-group attendance
  function groupAttendance(group: Group) {
    let present = 0, marked = 0;
    group.lessons.forEach(l => {
      l.attendances.forEach(a => { marked++; if (a.present) present++; });
    });
    return marked > 0 ? Math.round((present / marked) * 100) : 0;
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <SkeletonStatCards count={4} />
        <SkeletonTable rows={5} cols={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">Xush kelibsiz,</p>
          <h1 className="text-2xl font-bold text-slate-900">{user?.name || 'Ustoz'}</h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-700">
            {WEEKDAYS[now.getDay()]}, {now.getDate()} {MONTHS_UZ[now.getMonth()]}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{now.getFullYear()}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{groups.length}</p>
              <p className="text-xs text-slate-500">Guruhlar</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalStudents}</p>
              <p className="text-xs text-slate-500">O&apos;quvchilar</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalLessons}</p>
              <p className="text-xs text-slate-500">Jami darslar</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              attendanceRate >= 80 ? 'bg-emerald-100' : attendanceRate >= 50 ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              <TrendingUp className={`w-5 h-5 ${
                attendanceRate >= 80 ? 'text-emerald-600' : attendanceRate >= 50 ? 'text-amber-600' : 'text-red-600'
              }`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${
                attendanceRate >= 80 ? 'text-emerald-600' : attendanceRate >= 50 ? 'text-amber-600' : 'text-red-600'
              }`}>{attendanceRate}%</p>
              <p className="text-xs text-slate-500">Davomat</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bugungi darslar (bosilsa ochiladi) */}
      <TodayLessonsCard lessons={todayLessonItems} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Groups overview */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Guruhlarim</h2>
          </div>
          {groups.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Guruhlar yo&apos;q</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {groups.map(group => {
                const pct = groupAttendance(group);
                return (
                  <Link
                    key={group.id}
                    href="/dashboard/teacher/groups"
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
                      }`} />
                      <div>
                        <span className="text-sm font-semibold text-slate-800">{group.name}</span>
                        <span className="text-xs text-slate-400 ml-2">{group.subject}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{group._count.students} o&apos;quv.</span>
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        pct >= 80 ? 'bg-emerald-100 text-emerald-700'
                          : pct >= 50 ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-600'
                      }`}>{pct}%</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming lessons */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Kelasi darslar</h2>
          </div>
          {upcoming.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Kelasi hafta darslar yo&apos;q</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcoming.slice(0, 8).map(({ group, lesson }) => {
                const [, m, d] = lesson.scheduledDate.split('-');
                const dateObj = new Date(Number(lesson.scheduledDate.split('-')[0]), Number(m) - 1, Number(d));
                const weekday = WEEKDAYS[dateObj.getDay()];
                return (
                  <div key={lesson.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-slate-700 leading-none">{d}</span>
                      <span className="text-[8px] text-slate-400 leading-none mt-0.5">{MONTHS_UZ[Number(m) - 1].slice(0, 3)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{group.name}</p>
                      <p className="text-xs text-slate-400">{weekday} · {lesson.scheduledTime}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{lesson.order}-dars</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
