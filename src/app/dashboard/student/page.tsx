'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { UsersRound, BookOpen, Calendar, ArrowRight, Users } from 'lucide-react';
import { studentNav } from '@/lib/nav';

interface Lesson {
  id: string;
  topic: string | null;
  scheduledDate: string;
  scheduledTime: string;
  duration: string;
  order: number;
}

interface Group {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  meetLink: string;
  teacher: { id: string; name: string };
  lessons: Lesson[];
  _count: { students: number };
}

function countUpcomingLessons(groups: Group[]): number {
  const now = new Date();
  let count = 0;
  for (const group of groups) {
    for (const lesson of group.lessons) {
      const [y, m, d] = lesson.scheduledDate.split('-').map(Number);
      const [h, min] = lesson.scheduledTime.split(':').map(Number);
      const start = new Date(y, m - 1, d, h, min);
      if (start > now) count++;
    }
  }
  return count;
}

export default function StudentDashboardPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/groups')
      .then(res => res.ok ? res.json() : [])
      .then(data => setGroups(data))
      .finally(() => setLoading(false));
  }, []);

  const totalGroups = groups.length;
  const totalLessons = groups.reduce((sum, g) => sum + g.lessons.length, 0);
  const upcomingLessons = countUpcomingLessons(groups);

  const stats = [
    {
      label: 'Guruhlarim',
      value: totalGroups,
      icon: UsersRound,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Jami darslar',
      value: totalLessons,
      icon: BookOpen,
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      label: "Kelgusi darslar",
      value: upcomingLessons,
      icon: Calendar,
      color: 'bg-slate-100 text-slate-600',
    },
  ];

  return (
    <DashboardLayout navItems={studentNav} roleLabel="O'quvchi" roleColor="bg-blue-100 text-blue-700">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bosh sahifa</h1>
          <p className="text-slate-500 mt-1">O&apos;z guruhlaringiz va darslaringizni kuzating.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all">
              <div className={`w-12 h-12 ${stat.color.split(' ')[0]} rounded-2xl flex items-center justify-center mb-4`}>
                <stat.icon className={`w-6 h-6 ${stat.color.split(' ')[1]}`} />
              </div>
              <p className="text-3xl font-bold text-slate-900">{loading ? '—' : stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Group cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Guruhlarim</h2>
            <Link
              href="/dashboard/student/groups"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Barchasini ko&apos;rish <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
                  <div className="h-5 w-2/3 bg-slate-200 rounded mb-3" />
                  <div className="h-4 w-1/2 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <UsersRound className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Hozircha hech qanday guruh yo&apos;q</p>
              <p className="text-slate-400 text-sm mt-1">Administrator sizi guruhga qo&apos;shganda bu yerda ko&apos;rinadi</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {groups.map(group => (
                <Link
                  key={group.id}
                  href="/dashboard/student/groups"
                  className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:shadow-slate-100 transition-all hover:border-indigo-200 block"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <UsersRound className="w-6 h-6 text-indigo-600" />
                    </div>
                    <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full flex items-center gap-1">
                      <Users className="w-3 h-3" /> {group._count.students} ta o&apos;quvchi
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{group.name}</h3>
                  <p className="text-sm text-indigo-600 font-medium mb-3">{group.subject}</p>
                  <div className="space-y-1 text-sm text-slate-500">
                    <p>
                      <span className="font-medium text-slate-700">O&apos;qituvchi:</span> {group.teacher.name}
                    </p>
                    {group.schedule && (
                      <p>
                        <span className="font-medium text-slate-700">Jadval:</span> {group.schedule}
                      </p>
                    )}
                    <p>
                      <span className="font-medium text-slate-700">Darslar soni:</span> {group.lessons.length} ta
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
