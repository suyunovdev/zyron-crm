'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/skeleton';
import {
  Users, Wallet, Clock, CalendarDays, MapPin, Trophy, Medal, Loader2, BookOpen,
} from 'lucide-react';
import { fmtDate, fmtDayMonth } from '@/lib/date';

interface LeaderboardEntry {
  rank: number; name: string; present: number; total: number; pct: number;
  totalScore: number; maxScore: number; isChild: boolean;
}
interface GroupRanking { childRank: number; totalStudents: number; leaderboard: LeaderboardEntry[] }
interface GroupInfo {
  id: string; name: string; subject: string; price: number; lessonsPerMonth: number;
  time?: string; dayType?: string; room?: string; meetLink?: string; mode?: string;
  teacher: { id: string; name: string; phone?: string };
  _count: { students: number; lessons: number };
  ranking: GroupRanking;
}
interface RecentLesson { topic: string | null; date: string; groupName: string; present: boolean | null; isToday: boolean }
interface Child {
  id: string; name: string; status: string; groups: GroupInfo[];
  balance: { totalPaid: number; totalCost: number; balance: number };
  attendance: { present: number; total: number; pct: number };
  recentLessons: RecentLesson[];
  recentPayments: { amount: number; month: string; method: string; createdAt: string }[];
}
interface SessionUser { name: string }

const METHOD_LABELS: Record<string, string> = { cash: 'Naqd', card: 'Karta', transfer: "O'tkazma" };

function getRankBadge(rank: number) {
  if (rank === 1) return { icon: '🥇', cls: 'text-yellow-600 bg-yellow-50' };
  if (rank === 2) return { icon: '🥈', cls: 'text-slate-500 bg-slate-50' };
  if (rank === 3) return { icon: '🥉', cls: 'text-amber-700 bg-amber-50' };
  return { icon: `${rank}`, cls: 'text-slate-500 bg-slate-100' };
}

export default function ParentDashboardPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [openRanking, setOpenRanking] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/parent/children').then(r => r.ok ? r.json() : []),
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
    ]).then(([c, me]) => {
      const arr = Array.isArray(c) ? c : [];
      setChildren(arr);
      if (arr.length > 0) setSelectedChild(arr[0].id);
      if (me?.user) setUser(me.user);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const firstName = user?.name?.split(' ')[0] || '';
  const child = children.find(c => c.id === selectedChild) || null;

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

  const debt = child ? child.balance.balance < 0 : false;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Assalomu alaykum{firstName ? `, ${firstName}` : ''}
      </h1>

      {children.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Farzandlar topilmadi</p>
          <p className="text-xs text-slate-400 mt-1">Administrator farzandingizni bog&apos;laganda ko&apos;rinadi</p>
        </div>
      ) : (
        <>
          {/* Bir nechta farzand bo'lsa — tanlash */}
          {children.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {children.map(c => (
                <button key={c.id} onClick={() => setSelectedChild(c.id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    selectedChild === c.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700'
                  }`}>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {child && (
            <>
              {/* ── Balans / Qarz (eng muhim) ── */}
              <div className={`rounded-2xl p-6 border ${
                debt
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'
                  : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className={`w-5 h-5 ${debt ? 'text-red-600' : 'text-emerald-600'}`} />
                  <span className={`text-sm font-semibold ${debt ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {child.name} — {debt ? 'qarzi' : 'balansi'}
                  </span>
                </div>
                <p className={`text-4xl font-extrabold ${debt ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {Math.abs(child.balance.balance).toLocaleString()} <span className="text-xl font-bold">so&apos;m</span>
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  {debt ? 'Iltimos, to’lovni amalga oshiring yoki administrator bilan bog’laning.' : 'Hisob joyida.'}
                </p>
              </div>

              {/* ── Ixcham statlar: Davomat · To'langan · Guruhlar ── */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 text-center">
                  <p className={`text-2xl font-extrabold ${
                    child.attendance.pct >= 80 ? 'text-emerald-600' : child.attendance.pct >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}>{child.attendance.pct}%</p>
                  <p className="text-xs text-slate-400 mt-1">Davomat</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 text-center">
                  <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{child.groups.length}</p>
                  <p className="text-xs text-slate-400 mt-1">Guruh</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 text-center">
                  <p className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight">{child.balance.totalPaid.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-1">To&apos;langan (so&apos;m)</p>
                </div>
              </div>

              {/* ── O'tilgan mavzular (bugungisi ajratilgan) ── */}
              {child.recentLessons.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" /> O&apos;tilgan mavzular
                  </h2>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
                    {child.recentLessons.map((l, i) => (
                      <div key={i} className={`px-5 py-3 flex items-center gap-3 ${l.isToday ? 'bg-blue-50/60 dark:bg-blue-900/15' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${l.topic ? 'font-semibold text-slate-800 dark:text-white' : 'text-slate-400 italic'}`}>
                            {l.topic || 'Mavzu belgilanmagan'}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {l.groupName} &middot;{' '}
                            {l.isToday
                              ? <span className="text-blue-600 dark:text-blue-400 font-semibold">Bugun</span>
                              : fmtDayMonth(l.date)}
                          </p>
                        </div>
                        {l.present !== null && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-none ${
                            l.present ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {l.present ? 'Keldi' : 'Kelmadi'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Guruhlar ── */}
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Guruhlar</h2>
                {child.groups.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center text-sm text-slate-400">
                    Guruhlar mavjud emas
                  </div>
                ) : (
                  <div className="space-y-3">
                    {child.groups.map(g => {
                      const dayLabel = g.dayType === 'toq' ? 'Dush/Chor/Jum' : g.dayType === 'juft' ? 'Sesh/Pay/Shan' : '';
                      const r = g.ranking;
                      const isOpen = openRanking === g.id;
                      return (
                        <div key={g.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{g.name}</h3>
                                <p className="text-xs text-slate-400">{g.subject}</p>
                              </div>
                              {r.childRank > 0 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  Reyting: <span className="font-bold text-slate-800 dark:text-white">{r.childRank}</span>/{r.totalStudents}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-500 mb-3">
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {g.teacher.name}</span>
                              {g.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {g.time}</span>}
                              {dayLabel && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {dayLabel}</span>}
                              {g.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {g.room}</span>}
                            </div>
                            <div className="flex items-center gap-3 text-xs pt-3 border-t border-slate-100 dark:border-slate-700">
                              <span className="text-slate-400">Narx: <span className="font-bold text-slate-700 dark:text-slate-200">{g.price?.toLocaleString()} so&apos;m/oy</span></span>
                              <button onClick={() => setOpenRanking(isOpen ? null : g.id)}
                                className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-700/50 dark:text-slate-300 transition-colors">
                                <Trophy className="w-3.5 h-3.5" /> {isOpen ? 'Yopish' : 'Reyting'}
                              </button>
                            </div>
                          </div>

                          {isOpen && (
                            <div className="border-t border-slate-100 dark:border-slate-700">
                              <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-700/30">
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                  <Medal className="w-4 h-4 text-amber-500" /> Davomat reytingi
                                </p>
                              </div>
                              <div className="divide-y divide-slate-50 dark:divide-slate-700">
                                {r.leaderboard.map(entry => {
                                  const badge = getRankBadge(entry.rank);
                                  return (
                                    <div key={entry.rank}
                                      className={`px-5 py-2.5 flex items-center gap-3 ${entry.isChild ? 'bg-blue-50/70 dark:bg-blue-900/20' : ''}`}>
                                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${badge.cls}`}>{badge.icon}</span>
                                      <p className={`flex-1 min-w-0 text-sm truncate ${entry.isChild ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {entry.name}{entry.isChild && <span className="ml-1.5 text-[10px] text-blue-500">(Farzandingiz)</span>}
                                      </p>
                                      <span className={`text-sm font-bold ${entry.pct >= 80 ? 'text-emerald-600' : entry.pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{entry.pct}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── So'nggi to'lovlar ── */}
              {child.recentPayments.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">So&apos;nggi to&apos;lovlar</h2>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                    {child.recentPayments.map((p, i) => (
                      <div key={i} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{p.amount.toLocaleString()} so&apos;m</p>
                          <p className="text-xs text-slate-400">{p.month} &middot; {METHOD_LABELS[p.method] || p.method}</p>
                        </div>
                        <span className="text-xs text-slate-400">{fmtDate(p.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
