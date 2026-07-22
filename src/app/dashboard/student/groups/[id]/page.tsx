'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Users, Clock, Check, X, BookOpen, FolderOpen,
  MapPin, CalendarDays, Award, Sparkles, Video,
} from 'lucide-react';

interface Attendance { id: string; present: boolean }
interface Lesson {
  id: string; topic: string | null; scheduledDate: string; scheduledTime: string;
  duration: string; order: number; attendances: Attendance[];
}
interface Group {
  id: string; name: string; subject: string; schedule: string; room?: string;
  meetLink?: string; mode?: string; dayType?: string; time?: string;
  teacher: { id: string; name: string; phone?: string };
  lessons: Lesson[]; students?: { student: { id: string; name: string; status: string } }[];
  _count: { students: number; lessons: number };
}

function tzNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
}
function isSameDay(dateStr: string): boolean {
  const t = tzNow(); const [y, m, d] = dateStr.split('-').map(Number);
  return t.getFullYear() === y && t.getMonth() + 1 === m && t.getDate() === d;
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

const MONTHS_SHORT: Record<string, string> = { '01':'Yan','02':'Fev','03':'Mar','04':'Apr','05':'May','06':'Iyn','07':'Iyl','08':'Avg','09':'Sen','10':'Okt','11':'Noy','12':'Dek' };
const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];

function CircleProgress({ pct, size = 90, stroke = 8, color }: { pct: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/15" />
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" initial={{ strokeDasharray: c, strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }} transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }} />
    </svg>
  );
}

function getLevel(pct: number) {
  if (pct >= 95) return { name: 'Olmos', emoji: '💎', bg: 'from-cyan-400 to-blue-500' };
  if (pct >= 85) return { name: 'Oltin', emoji: '🏆', bg: 'from-yellow-400 to-amber-500' };
  if (pct >= 70) return { name: 'Kumush', emoji: '🥈', bg: 'from-slate-300 to-slate-400' };
  if (pct >= 50) return { name: 'Bronza', emoji: '🥉', bg: 'from-orange-400 to-orange-500' };
  return { name: 'Yangi', emoji: '🌱', bg: 'from-slate-400 to-slate-500' };
}

type TabType = 'davomat' | 'mavzular' | 'guruh';

const tabContent = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

export default function StudentGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('davomat');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [now, setNow] = useState(tzNow());

  // Update clock every 30 seconds for lesson active check
  useEffect(() => {
    const interval = setInterval(() => setNow(tzNow()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch(`/api/student/groups/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setGroup(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const availableMonths = useMemo(() => {
    if (!group) return [];
    const s = new Set<string>();
    group.lessons.forEach(l => { const [y, m] = l.scheduledDate.split('-'); s.add(`${y}-${m}`); });
    return Array.from(s).sort();
  }, [group]);

  useEffect(() => {
    if (!availableMonths.length) { setSelectedMonth(''); return; }
    const cm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(availableMonths.includes(cm) ? cm : availableMonths[availableMonths.length - 1]);
  }, [availableMonths, now]);

  const filteredLessons = useMemo(() => {
    if (!group || !selectedMonth) return [];
    return group.lessons.filter(l => { const [y, m] = l.scheduledDate.split('-'); return `${y}-${m}` === selectedMonth; })
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.order - b.order);
  }, [group, selectedMonth]);

  const teacherInitials = useMemo(() => {
    if (!group) return '';
    const p = group.teacher.name.split(' ');
    return p.length >= 2 ? `${p[0]}.${p[1][0]}` : p[0];
  }, [group]);

  const stats = useMemo(() => {
    if (!group) return { present: 0, absent: 0, total: 0, pct: 0 };
    let present = 0, absent = 0;
    group.lessons.forEach(l => { if (l.attendances.length > 0) { if (l.attendances[0].present) present++; else absent++; } });
    const total = present + absent;
    return { present, absent, total, pct: total > 0 ? Math.round((present / total) * 100) : 0 };
  }, [group]);

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const today = getTodayStr();
  // Check if any lesson is live right now
  const isLessonLive = useMemo(() => {
    if (!group) return false;
    return group.lessons.some(l => isLessonNow(l.scheduledDate, l.scheduledTime, l.duration));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, now]);

  const pctColor = stats.pct >= 80 ? '#10b981' : stats.pct >= 50 ? '#f59e0b' : '#ef4444';
  const level = getLevel(stats.pct);
  const tabs: { key: TabType; label: string; icon: typeof BookOpen }[] = [
    { key: 'davomat', label: 'Davomat', icon: CalendarDays },
    { key: 'mavzular', label: 'Mavzular', icon: BookOpen },
    { key: 'guruh', label: 'Guruh', icon: Users },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <motion.div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
    </div>
  );

  if (!group) return (
    <div className="flex flex-col items-center justify-center h-64">
      <p className="text-sm font-medium text-slate-400">Guruh topilmadi</p>
      <Link href="/dashboard/student/groups" className="text-blue-500 text-sm mt-2 hover:underline">Orqaga</Link>
    </div>
  );

  const dayLabel = group.dayType === 'toq' ? 'Dush/Chor/Jum' : group.dayType === 'juft' ? 'Sesh/Pay/Shan' : group.schedule;

  return (
    <motion.div className="space-y-5 -mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Link href="/dashboard/student/groups" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-blue-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Guruhlarim
      </Link>

      {/* ═══ HERO ═══ */}
      <motion.div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a5f] via-[#1a2e4a] to-[#0f1b2d] p-6 text-white"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <motion.div className="absolute top-6 right-16 w-1 h-1 bg-blue-400/40 rounded-full"
          animate={{ y: [-8, 8, -8], opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 4, repeat: Infinity }} />

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <motion.h1 className="text-xl lg:text-2xl font-extrabold" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              {group.name}
            </motion.h1>
            <p className="text-blue-200/50 text-sm mt-1">{group.subject} &middot; {group.teacher.name}</p>

            {group.meetLink && (
              isLessonLive ? (
                <motion.a
                  href={group.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                >
                  <motion.span className="w-2 h-2 rounded-full bg-white" animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                  <Video className="w-4 h-4" />
                  Darsga kirish
                </motion.a>
              ) : (
                <motion.button
                  disabled
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-slate-500/50 text-white/60 rounded-xl text-sm font-bold cursor-not-allowed"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                >
                  <Video className="w-4 h-4" />
                  Dars boshlanmagan
                </motion.button>
              )
            )}

            {stats.total > 0 && (
              <motion.div className="mt-3 inline-flex items-center gap-1.5" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, type: 'spring' }}>
                <div className={`flex items-center gap-1.5 bg-gradient-to-r ${level.bg} px-2.5 py-1 rounded-full shadow-lg`}>
                  <span className="text-xs">{level.emoji}</span>
                  <span className="text-[10px] font-bold text-white">{level.name}</span>
                </div>
              </motion.div>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {[
                group.time ? { icon: Clock, text: group.time } : null,
                dayLabel ? { icon: CalendarDays, text: dayLabel } : null,
                group.room ? { icon: MapPin, text: group.room } : null,
                { icon: Users, text: `${group._count.students}` },
                { icon: BookOpen, text: `${group._count.lessons} dars` },
              ].filter((x): x is { icon: typeof Clock; text: string } => x !== null).map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.span key={i} className="inline-flex items-center gap-1 text-[11px] bg-white/[0.07] backdrop-blur-sm px-2.5 py-1 rounded-lg text-blue-100"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                    <Icon className="w-3 h-3" /> {item.text}
                  </motion.span>
                );
              })}
            </div>
          </div>

          <motion.div className="flex-shrink-0 flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}>
            <div className="relative">
              <CircleProgress pct={stats.total > 0 ? stats.pct : 0} color={pctColor} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold">{stats.total > 0 ? stats.pct : 0}%</span>
                <span className="text-[8px] text-blue-200/50 font-semibold">DAVOMAT</span>
              </div>
            </div>
            {stats.total > 0 && (
              <div className="flex items-center gap-2 mt-2 text-[11px]">
                <span className="text-emerald-400 font-semibold">{stats.present} keldi</span>
                <span className="text-red-400 font-semibold">{stats.absent} yo&apos;q</span>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 relative flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors z-10"
              style={{ color: active ? undefined : '#94a3b8' }}>
              {active && (
                <motion.div className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-sm" layoutId="activeTab"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              )}
              <span className="relative flex items-center gap-1.5">
                <Icon className="w-4 h-4" />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} variants={tabContent} initial="hidden" animate="visible" exit="exit">

          {/* DAVOMAT */}
          {activeTab === 'davomat' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              {availableMonths.length > 0 && (
                <div className="px-5 py-3 flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 dark:border-slate-700">
                  {availableMonths.map(month => {
                    const [y, m] = month.split('-');
                    const label = `${MONTHS_SHORT[m]||m} ${y.slice(2)}`;
                    const isCurrent = selectedMonth === month;
                    const isNow = month === currentMonthKey;
                    return (
                      <motion.button key={month} onClick={() => setSelectedMonth(month)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                          isCurrent ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-transparent shadow-sm'
                          : isNow ? 'border-blue-200 dark:border-blue-700 text-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500 bg-white dark:bg-slate-800 hover:border-slate-300'
                        }`}>{label}</motion.button>
                    );
                  })}
                </div>
              )}
              {filteredLessons.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400">Bu oyda darslar mavjud emas</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left pl-5 pr-3 py-2.5 text-xs font-semibold text-slate-500 sticky left-0 bg-white dark:bg-slate-800 z-10 min-w-[100px]">Dars</th>
                        {filteredLessons.map(l => {
                          const [,m,d] = l.scheduledDate.split('-');
                          const isT = isSameDay(l.scheduledDate);
                          const isPast = l.scheduledDate <= today;
                          return (
                            <th key={l.id} className={`px-1 py-2 text-center min-w-[52px] ${isT ? 'bg-blue-50 dark:bg-blue-900/15' : ''}`}>
                              <div className={`text-[11px] font-bold ${isT ? 'text-blue-600' : isPast ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-500'}`}>{d}.{m}</div>
                              {teacherInitials && <div className={`text-[9px] font-medium mt-0.5 ${isT ? 'text-blue-500' : isPast ? 'text-slate-400' : 'text-slate-300'}`}>{teacherInitials}</div>}
                            </th>
                          );
                        })}
                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 min-w-[65px]">Umumiy</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="pl-5 pr-3 py-3 sticky left-0 bg-white dark:bg-slate-800 z-10">
                          <span className="text-[13px] font-semibold text-slate-800 dark:text-white">Mening davomatim</span>
                        </td>
                        {filteredLessons.map((lesson, i) => {
                          const rec = lesson.attendances[0];
                          const isT = isSameDay(lesson.scheduledDate);
                          return (
                            <td key={lesson.id} className={`px-0.5 py-1.5 text-center ${isT ? 'bg-blue-50 dark:bg-blue-900/15' : ''}`}>
                              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.03 * i, type: 'spring', stiffness: 200 }} className="inline-block">
                                {rec ? rec.present ? (
                                  <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center mx-auto shadow-sm shadow-emerald-500/25">
                                    <Check className="w-4 h-4 text-white stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-7 h-7 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center mx-auto shadow-sm shadow-red-500/25">
                                    <X className="w-3.5 h-3.5 text-white stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-7 h-7 border border-dashed border-slate-200 dark:border-slate-600 rounded-lg mx-auto" />
                                )}
                              </motion.div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-bold ${stats.total === 0 ? 'text-slate-300' : stats.pct >= 80 ? 'text-emerald-600' : stats.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {stats.total === 0 ? '—' : `${stats.present}/${stats.total}`}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* MAVZULAR */}
          {activeTab === 'mavzular' && (
            <div className="space-y-2">
              {group.lessons.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center text-sm text-slate-400">Darslar mavjud emas</div>
              ) : (
                group.lessons.map((lesson, i) => {
                  const [,m,d] = lesson.scheduledDate.split('-').map(Number);
                  const isT = isSameDay(lesson.scheduledDate);
                  const isPast = lesson.scheduledDate < today;
                  const rec = lesson.attendances[0];
                  return (
                    <motion.div key={lesson.id}
                      className={`bg-white dark:bg-slate-800 rounded-xl border ${isT ? 'border-blue-200 dark:border-blue-700 shadow-blue-500/5' : 'border-slate-100 dark:border-slate-700'} shadow-sm px-5 py-3.5 flex items-start gap-3.5`}
                      initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.03 * i }} whileHover={{ x: 4 }}>
                      <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                        isT ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
                        : isPast ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        : 'bg-slate-50 dark:bg-slate-750 text-slate-400'
                      }`}>
                        <span className="text-sm font-bold leading-none">{d}</span>
                        <span className="text-[8px] uppercase leading-none mt-0.5 font-bold">{MONTHS_UZ[m-1]?.slice(0,3)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{lesson.order}-dars</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {lesson.scheduledTime} &middot; {lesson.duration}</span>
                        </div>
                        {lesson.topic ? <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{lesson.topic}</p>
                          : <p className="text-sm text-slate-400 italic">Mavzu hali yozilmagan</p>}
                      </div>
                      <div className="flex-shrink-0">
                        {rec ? rec.present ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1.5 rounded-lg"><Check className="w-3 h-3" /> Keldi</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2.5 py-1.5 rounded-lg"><X className="w-3 h-3" /> Kelmadi</span>
                        ) : isPast ? <span className="text-[11px] text-slate-300">—</span> : null}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* GURUH */}
          {activeTab === 'guruh' && (
            <div className="space-y-4">
              <motion.div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">O&apos;qituvchi</h3>
                <div className="flex items-center gap-4">
                  <motion.div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20"
                    whileHover={{ rotate: [0, -5, 5, 0], scale: 1.05 }}>
                    <span className="text-white font-bold text-base">{group.teacher.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</span>
                  </motion.div>
                  <div>
                    <p className="text-base font-bold text-slate-800 dark:text-white">{group.teacher.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">O&apos;qituvchi</p>
                  </div>
                </div>
              </motion.div>

              <motion.div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Guruh ma&apos;lumotlari</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { l: 'Guruh', v: group.name }, { l: 'Fan', v: group.subject },
                    { l: "O'quvchilar", v: `${group._count.students} ta` }, { l: 'Darslar', v: `${group._count.lessons} ta` },
                    group.room ? { l: 'Xona', v: group.room } : null, group.time ? { l: 'Vaqt', v: group.time } : null,
                    dayLabel ? { l: 'Kunlar', v: dayLabel } : null,
                  ].filter(Boolean).map(item => (
                    <div key={item!.l}>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">{item!.l}</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{item!.v}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {group.students && group.students.length > 0 && (
                <motion.div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Guruh a&apos;zolari ({group.students.length})</h3>
                  <div className="space-y-1">
                    {group.students.map(({ student }, idx) => (
                      <motion.div key={student.id}
                        className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * idx }}>
                        <span className="text-xs text-slate-400 w-5 text-right font-mono">{idx + 1}</span>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          student.status === 'active' ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-sm shadow-blue-500/20'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                        }`}>{student.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{student.name}</span>
                        {student.status === 'active' && <motion.span className="w-2 h-2 rounded-full bg-emerald-500 ml-auto"
                          animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }} />}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
