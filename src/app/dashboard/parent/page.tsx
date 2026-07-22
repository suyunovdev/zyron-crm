'use client';

import { useState, useEffect } from 'react';
import {
  Users, BookOpen, Check, X, Wallet, TrendingUp,
  Clock, CalendarDays, MapPin, AlertTriangle, Video, Trophy, Medal,
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number; name: string; present: number; total: number; pct: number;
  totalScore: number; maxScore: number; isChild: boolean;
}

interface GroupRanking {
  childRank: number; totalStudents: number; leaderboard: LeaderboardEntry[];
}

interface GroupInfo {
  id: string; name: string; subject: string; price: number; lessonsPerMonth: number;
  time?: string; dayType?: string; room?: string; meetLink?: string; mode?: string;
  teacher: { id: string; name: string; phone?: string };
  _count: { students: number; lessons: number };
  ranking: GroupRanking;
}

interface Child {
  id: string;
  name: string;
  status: string;
  groups: GroupInfo[];
  balance: { totalPaid: number; totalCost: number; balance: number };
  attendance: { present: number; total: number; pct: number };
  recentPayments: { amount: number; month: string; method: string; createdAt: string }[];
}

interface SessionUser { name: string }

function tzNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
}

function getGreeting(): string {
  const h = tzNow().getHours();
  if (h < 6) return 'Tun yaxshi';
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

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
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-400">{getGreeting()} 👋</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{firstName}!</h1>
      </div>

      {children.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Farzandlar topilmadi</p>
          <p className="text-xs text-slate-400 mt-1">Administrator farzandingizni bog&apos;laganda ko&apos;rinadi</p>
        </div>
      ) : (
        <>
          {/* Child selector */}
          {children.length > 1 && (
            <div className="flex gap-2">
              {children.map(c => (
                <button key={c.id} onClick={() => setSelectedChild(c.id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    selectedChild === c.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {child && (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Davomat */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Davomat</p>
                      <p className={`text-xl font-extrabold ${
                        child.attendance.pct >= 80 ? 'text-emerald-600' : child.attendance.pct >= 50 ? 'text-amber-600' : 'text-red-600'
                      }`}>{child.attendance.pct}%</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{child.attendance.present} keldi / {child.attendance.total} jami</p>
                </div>

                {/* Balans */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      child.balance.balance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      <Wallet className={`w-5 h-5 ${child.balance.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Balans</p>
                      <p className={`text-xl font-extrabold ${child.balance.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {child.balance.balance.toLocaleString()} <span className="text-sm">so&apos;m</span>
                      </p>
                    </div>
                  </div>
                  {child.balance.balance < 0 && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Qarzdorlik mavjud
                    </p>
                  )}
                </div>

                {/* To'langan */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Jami to&apos;langan</p>
                      <p className="text-xl font-extrabold text-slate-800 dark:text-white">
                        {child.balance.totalPaid.toLocaleString()} <span className="text-sm text-slate-400">so&apos;m</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Guruhlar */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Guruhlar</p>
                      <p className="text-xl font-extrabold text-slate-800 dark:text-white">{child.groups.length} <span className="text-sm text-slate-400">ta</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Groups with Rankings */}
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" /> {child.name} guruhlari
                </h2>
                {child.groups.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-8 text-center text-sm text-slate-400">
                    Guruhlar mavjud emas
                  </div>
                ) : (
                  <div className="space-y-4">
                    {child.groups.map(g => {
                      const dayLabel = g.dayType === 'toq' ? 'Dush/Chor/Jum' : g.dayType === 'juft' ? 'Sesh/Pay/Shan' : '';
                      const r = g.ranking;
                      const rankBadge = getRankBadge(r.childRank);
                      const isOpen = openRanking === g.id;

                      return (
                        <div key={g.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                          <div className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{g.name}</h3>
                                <p className="text-xs text-slate-400">{g.subject}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                g.mode === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {g.mode === 'online' ? '🌐 Online' : '🏫 Offline'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-500 mb-3">
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {g.teacher.name}</span>
                              {g.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {g.time}</span>}
                              {dayLabel && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {dayLabel}</span>}
                              {g.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {g.room}</span>}
                            </div>

                            {/* Child's rank badge */}
                            {r.childRank > 0 && (
                              <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-800/30">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${rankBadge.cls}`}>
                                  {rankBadge.icon}
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">Farzandingiz o&apos;rni</p>
                                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                                    {r.childRank}-o&apos;rin <span className="text-slate-400 font-normal">/ {r.totalStudents} o&apos;quvchi</span>
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-3 text-xs pt-3 border-t border-slate-100 dark:border-slate-700">
                              <span className="text-slate-400">Narx: <span className="font-bold text-slate-700 dark:text-slate-200">{g.price?.toLocaleString()} so&apos;m/oy</span></span>
                              <span className="text-slate-400">Darslar: <span className="font-bold text-slate-700 dark:text-slate-200">{g._count.lessons}</span></span>
                              <button
                                onClick={() => setOpenRanking(isOpen ? null : g.id)}
                                className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 transition-colors"
                              >
                                <Trophy className="w-3.5 h-3.5" />
                                {isOpen ? 'Yopish' : 'Reyting'}
                              </button>
                            </div>
                            {g.meetLink && (
                              <a href={g.meetLink} target="_blank" rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:text-emerald-700">
                                <Video className="w-3.5 h-3.5" /> Darsga kirish linki
                              </a>
                            )}
                          </div>

                          {/* Leaderboard */}
                          {isOpen && (
                            <div className="border-t border-slate-100 dark:border-slate-700">
                              <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-700/30">
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                  <Medal className="w-4 h-4 text-amber-500" /> Davomat reytingi — {g.name}
                                </p>
                              </div>
                              <div className="divide-y divide-slate-50 dark:divide-slate-700">
                                {r.leaderboard.map(entry => {
                                  const badge = getRankBadge(entry.rank);
                                  return (
                                    <div key={entry.rank}
                                      className={`px-5 py-2.5 flex items-center gap-3 ${
                                        entry.isChild
                                          ? 'bg-blue-50/70 dark:bg-blue-900/20 border-l-3 border-blue-500'
                                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/20'
                                      }`}
                                    >
                                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${badge.cls}`}>
                                        {badge.icon}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm truncate ${
                                          entry.isChild ? 'font-bold text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                                        }`}>
                                          {entry.name}
                                          {entry.isChild && <span className="ml-1.5 text-[10px] text-blue-500">(Farzandingiz)</span>}
                                        </p>
                                      </div>
                                      <div className="text-right flex items-center gap-3">
                                        <div>
                                          <p className={`text-sm font-bold ${
                                            entry.totalScore > 0 ? 'text-amber-600' : 'text-slate-300'
                                          }`}>{entry.totalScore}<span className="text-[10px] text-slate-400 font-normal"> ball</span></p>
                                        </div>
                                        <div>
                                          <p className={`text-sm font-bold ${
                                            entry.pct >= 80 ? 'text-emerald-600' : entry.pct >= 50 ? 'text-amber-600' : 'text-red-500'
                                          }`}>{entry.pct}%</p>
                                          <p className="text-[10px] text-slate-400">{entry.present}/{entry.total}</p>
                                        </div>
                                      </div>
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

              {/* Recent payments */}
              {child.recentPayments.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-violet-500" /> So&apos;nggi to&apos;lovlar
                  </h2>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                    {child.recentPayments.map((p, i) => (
                      <div key={i} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">
                            {p.amount.toLocaleString()} so&apos;m
                          </p>
                          <p className="text-xs text-slate-400">
                            {p.month} &middot; {METHOD_LABELS[p.method] || p.method}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(p.createdAt).toLocaleDateString('uz-UZ')}
                        </span>
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
