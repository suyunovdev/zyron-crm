'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Clock,
  BookOpen,
  CalendarDays,
  MapPin,
  ChevronRight,
  Check,
  X,
  Zap,
  Target,
  Video,
} from 'lucide-react';

interface Attendance { id: string; present: boolean }
interface Lesson {
  id: string;
  topic: string | null;
  scheduledDate: string;
  scheduledTime: string;
  duration: string;
  order: number;
  attendances: Attendance[];
}
interface Group {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  room?: string;
  meetLink?: string;
  mode?: string;
  dayType?: string;
  time?: string;
  teacher: { id: string; name: string };
  lessons: Lesson[];
  _count: { students: number; lessons: number };
}

function tzNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
}
function getTodayStr(): string {
  const t = tzNow();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}
function isLessonNow(date: string, time: string, duration: string): boolean {
  const n = tzNow();
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const dur = parseFloat(duration.match(/[\d.]+/)?.[0] || '1.5');
  const end = new Date(start.getTime() + dur * 3600000);
  return n >= start && n <= end;
}
function hasActiveLessonNow(group: Group): boolean {
  return group.lessons.some(l => isLessonNow(l.scheduledDate, l.scheduledTime, l.duration));
}

const GROUP_COLORS = [
  { from: 'from-blue-500', to: 'to-cyan-400', border: 'border-blue-100 dark:border-blue-800/30', accent: '#3b82f6' },
  { from: 'from-violet-500', to: 'to-purple-400', border: 'border-violet-100 dark:border-violet-800/30', accent: '#8b5cf6' },
  { from: 'from-emerald-500', to: 'to-teal-400', border: 'border-emerald-100 dark:border-emerald-800/30', accent: '#10b981' },
  { from: 'from-orange-500', to: 'to-amber-400', border: 'border-orange-100 dark:border-orange-800/30', accent: '#f97316' },
  { from: 'from-rose-500', to: 'to-pink-400', border: 'border-rose-100 dark:border-rose-800/30', accent: '#f43f5e' },
];

export default function StudentGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);
  const today = getTodayStr();

  // Re-render every 30s to update lesson active state
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/api/student/groups')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setGroups(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-16 h-16 mb-4 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          <Users className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-sm font-semibold text-slate-500">Hozircha guruhlar mavjud emas</p>
        <p className="text-xs text-slate-400 mt-1">Administrator sizni guruhga qo&apos;shganda ko&apos;rinadi</p>
      </div>
    );
  }

  // Overall stats
  let totalPresent = 0, totalAbsent = 0;
  groups.forEach(g => g.lessons.forEach(l => {
    if (l.attendances.length > 0) {
      if (l.attendances[0].present) totalPresent++; else totalAbsent++;
    }
  }));
  const totalAll = totalPresent + totalAbsent;
  const totalPct = totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header with overall stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" /> Guruhlarim
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">{groups.length} ta guruhda o&apos;qiyapsiz</p>
        </div>
        {totalAll > 0 && (
          <div className="flex items-center gap-4 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="text-center">
              <p className={`text-xl font-extrabold ${totalPct >= 80 ? 'text-emerald-600' : totalPct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{totalPct}%</p>
              <p className="text-[10px] text-slate-400">Umumiy</p>
            </div>
            <div className="w-px h-8 bg-slate-100 dark:bg-slate-700" />
            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-600 font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {totalPresent}</span>
              <span className="text-red-500 font-semibold flex items-center gap-1"><X className="w-3.5 h-3.5" /> {totalAbsent}</span>
            </div>
          </div>
        )}
      </div>

      {/* Groups grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((group, idx) => {
          const theme = GROUP_COLORS[idx % GROUP_COLORS.length];
          let present = 0, absent = 0;
          group.lessons.forEach(l => {
            if (l.attendances.length > 0) {
              if (l.attendances[0].present) present++; else absent++;
            }
          });
          const total = present + absent;
          const pct = total > 0 ? Math.round((present / total) * 100) : 0;
          const nextL = group.lessons.find(l => l.scheduledDate >= today);
          const dayLabel = group.dayType === 'toq' ? 'Dush/Chor/Jum' : group.dayType === 'juft' ? 'Sesh/Pay/Shan' : group.schedule;
          const completedLessons = group.lessons.filter(l => l.scheduledDate < today).length;

          return (
            <Link
              key={group.id}
              href={`/dashboard/student/groups/${group.id}`}
              className={`relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border ${theme.border} shadow-sm hover:shadow-lg transition-all duration-300 group`}
            >
              <div className={`h-1.5 bg-gradient-to-r ${theme.from} ${theme.to}`} />

              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center shadow-lg`}
                      style={{ boxShadow: `0 4px 14px ${theme.accent}33` }}>
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{group.name}</h3>
                      <p className="text-xs text-slate-400">{group.subject}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all mt-1" />
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">Davomat</span>
                    <span className={`text-sm font-extrabold ${total === 0 ? 'text-slate-300' : pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                      {total > 0 ? `${pct}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div className={`h-2 rounded-full bg-gradient-to-r ${theme.from} ${theme.to} transition-all duration-700`}
                      style={{ width: total > 0 ? `${pct}%` : '0%' }} />
                  </div>
                  {total > 0 && (
                    <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                      <span className="text-emerald-600 font-semibold flex items-center gap-0.5"><Check className="w-3 h-3" /> {present}</span>
                      <span className="text-red-500 font-semibold flex items-center gap-0.5"><X className="w-3 h-3" /> {absent}</span>
                      <span className="text-slate-400 ml-auto">{completedLessons}/{group._count.lessons} dars</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {group.teacher.name}</span>
                  {group.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {group.time}</span>}
                  {dayLabel && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {dayLabel}</span>}
                  {group.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {group.room}</span>}
                  {group.meetLink && (
                    hasActiveLessonNow(group) ? (
                      <a href={group.meetLink} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-emerald-500 hover:text-emerald-600 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <Video className="w-3 h-3" /> Darsga kirish
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-300 cursor-not-allowed">
                        <Video className="w-3 h-3" /> Dars boshlanmagan
                      </span>
                    )
                  )}
                </div>

                {nextL && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <Zap className={`w-3.5 h-3.5 flex-shrink-0 ${nextL.scheduledDate === today ? 'text-blue-500' : 'text-slate-300'}`} />
                    <p className="text-xs truncate">
                      <span className={`font-semibold ${nextL.scheduledDate === today ? 'text-blue-600' : 'text-slate-500 dark:text-slate-300'}`}>
                        {nextL.scheduledDate === today ? 'Bugun' : nextL.scheduledDate.split('-').reverse().join('.')}
                      </span>
                      <span className="text-slate-400"> &middot; {nextL.order}-dars</span>
                      {nextL.topic && <span className="text-slate-400"> &middot; {nextL.topic}</span>}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
