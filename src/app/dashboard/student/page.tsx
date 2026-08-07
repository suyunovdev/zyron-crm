'use client';

import { useState, useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/skeleton';
import Link from 'next/link';
import {
  BookOpen, Clock, MapPin, Users, ChevronRight,
  CalendarDays, Wallet, Check, X, Loader2,
} from 'lucide-react';

interface Attendance { id: string; present: boolean }
interface Lesson {
  id: string; scheduledDate: string; scheduledTime: string; order: number; attendances: Attendance[];
}
interface Group {
  id: string; name: string; subject: string; schedule: string; room?: string;
  dayType?: string; time?: string; teacher: { id: string; name: string };
  lessons: Lesson[]; _count: { students: number; lessons: number };
}
interface SessionUser { name: string }
interface BalanceData { balance: number; totalPaid: number; totalCost: number }

function tzNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
}
function getTodayStr(): string {
  const t = tzNow();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

const MONTHS = ['', 'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

export default function StudentDashboardPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/student/groups').then(r => r.ok ? r.json() : []),
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
      fetch('/api/student/balance').then(r => r.ok ? r.json() : null),
    ]).then(([g, me, bal]) => {
      setGroups(Array.isArray(g) ? g : []);
      if (me?.user) setUser(me.user);
      if (bal) setBalance(bal);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const today = getTodayStr();
  const firstName = user?.name?.split(' ')[0] || '';

  const stats = useMemo(() => {
    let present = 0, absent = 0;
    groups.forEach(g => g.lessons.forEach(l => {
      if (l.attendances.length > 0) { if (l.attendances[0].present) present++; else absent++; }
    }));
    const total = present + absent;
    return { present, absent, total, pct: total > 0 ? Math.round((present / total) * 100) : 0 };
  }, [groups]);

  const nextLesson = useMemo(() => {
    let best: { group: Group; lesson: Lesson } | null = null;
    for (const g of groups) {
      for (const l of g.lessons) {
        if (l.scheduledDate >= today && (!best || l.scheduledDate < best.lesson.scheduledDate ||
          (l.scheduledDate === best.lesson.scheduledDate && l.scheduledTime < best.lesson.scheduledTime))) {
          best = { group: g, lesson: l };
        }
      }
    }
    return best;
  }, [groups, today]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  const debt = balance ? balance.balance < 0 : false;
  const isToday = nextLesson?.lesson.scheduledDate === today;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Salom */}
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Assalomu alaykum{firstName ? `, ${firstName}` : ''}
      </h1>

      {/* ── Balans / Qarz (eng muhim) ── */}
      {balance && (
        <div className={`rounded-2xl p-6 border ${
          debt
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'
            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className={`w-5 h-5 ${debt ? 'text-red-600' : 'text-emerald-600'}`} />
            <span className={`text-sm font-semibold ${debt ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {debt ? 'Qarzingiz' : 'Balansingiz'}
            </span>
          </div>
          <p className={`text-4xl font-extrabold ${debt ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {Math.abs(balance.balance).toLocaleString()} <span className="text-xl font-bold">so&apos;m</span>
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {debt
              ? 'Iltimos, to’lovni amalga oshiring yoki administrator bilan bog’laning.'
              : 'Hisobingiz joyida.'}
          </p>
        </div>
      )}

      {/* ── Davomat ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Umumiy davomat</span>
          <span className={`text-2xl font-extrabold ${
            stats.total === 0 ? 'text-slate-300' : stats.pct >= 80 ? 'text-emerald-600' : stats.pct >= 50 ? 'text-amber-500' : 'text-red-500'
          }`}>{stats.total > 0 ? `${stats.pct}%` : '—'}</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
          <div className={`h-full rounded-full ${stats.pct >= 80 ? 'bg-emerald-500' : stats.pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${stats.pct}%` }} />
        </div>
        {stats.total > 0 && (
          <div className="flex items-center gap-5 mt-3 text-sm">
            <span className="text-emerald-600 font-semibold flex items-center gap-1"><Check className="w-4 h-4" /> Keldi: {stats.present}</span>
            <span className="text-red-500 font-semibold flex items-center gap-1"><X className="w-4 h-4" /> Kelmadi: {stats.absent}</span>
          </div>
        )}
      </div>

      {/* ── Keyingi dars ── */}
      {nextLesson && (
        <Link href={`/dashboard/student/groups/${nextLesson.group.id}`}
          className="block bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-none ${
              isToday ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
            }`}>
              <span className="text-lg font-extrabold leading-none">{nextLesson.lesson.scheduledDate.split('-')[2]}</span>
              <span className="text-[9px] uppercase font-bold mt-0.5 opacity-80">{MONTHS[Number(nextLesson.lesson.scheduledDate.split('-')[1])]}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                {isToday && <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded-full">BUGUN</span>}
                <span className="text-xs text-slate-400">Keyingi dars</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{nextLesson.group.name}</h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {nextLesson.lesson.scheduledTime}</span>
                {nextLesson.group.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {nextLesson.group.room}</span>}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 flex-none" />
          </div>
        </Link>
      )}

      {/* ── Guruhlarim ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Guruhlarim</h2>
          {groups.length > 0 && (
            <Link href="/dashboard/student/groups" className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1">
              Barchasi <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">Hozircha guruhlar yo&apos;q</p>
            <p className="text-xs text-slate-400 mt-1">Administrator sizni guruhga qo&apos;shganda ko&apos;rinadi</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map(group => {
              let present = 0, total = 0;
              group.lessons.forEach(l => { if (l.attendances.length > 0) { total++; if (l.attendances[0].present) present++; } });
              const pct = total > 0 ? Math.round((present / total) * 100) : 0;
              const dayLabel = group.dayType === 'toq' ? 'Dush/Chor/Jum' : group.dayType === 'juft' ? 'Sesh/Pay/Shan' : group.schedule;
              return (
                <Link key={group.id} href={`/dashboard/student/groups/${group.id}`}
                  className="block bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center flex-none">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{group.name}</h3>
                        <p className="text-xs text-slate-400">{group.subject}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-none mt-1" />
                  </div>

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">Davomat</span>
                    <span className={`text-sm font-bold ${total === 0 ? 'text-slate-300' : pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                      {total > 0 ? `${pct}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 pt-3 mt-3 border-t border-slate-100 dark:border-slate-700">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {group.teacher.name}</span>
                    {group.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {group.time}</span>}
                    {dayLabel && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {dayLabel}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
