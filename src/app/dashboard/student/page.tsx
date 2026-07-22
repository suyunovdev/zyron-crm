'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Check, X, Flame, Clock, MapPin, Users, ChevronRight,
  CalendarDays, Zap, Target, Award, Trophy, Star, Sparkles, TrendingUp,
  AlertTriangle, Wallet,
} from 'lucide-react';

interface Attendance { id: string; present: boolean }
interface Lesson {
  id: string; topic: string | null; scheduledDate: string; scheduledTime: string;
  duration: string; order: number; attendances: Attendance[];
}
interface Group {
  id: string; name: string; subject: string; schedule: string; room?: string;
  dayType?: string; time?: string; teacher: { id: string; name: string };
  lessons: Lesson[]; _count: { students: number; lessons: number };
}
interface SessionUser { name: string }
interface BalanceData {
  balance: number;
  totalPaid: number;
  totalCost: number;
  groups: { groupId: string; groupName: string; price: number; attendedLessons: number; cost: number }[];
}

function tzNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
}

function getTodayStr(): string {
  const t = tzNow();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function getGreeting(): string {
  const h = tzNow().getHours();
  if (h < 6) return 'Tun yaxshi';
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

function getGreetingEmoji(): string {
  const h = tzNow().getHours();
  if (h < 6) return '🌙';
  if (h < 12) return '🌅';
  if (h < 18) return '☀️';
  return '🌆';
}

// Animated number counter
function AnimatedNumber({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const animate = (time: number) => {
      const elapsed = (time - startTime) / (duration * 1000);
      if (elapsed >= 1) { setDisplay(value); ref.current = value; return; }
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setDisplay(Math.round(start + diff * eased));
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <>{display}</>;
}

// SVG Circular Progress with animation
function CircleProgress({ pct, size = 140, stroke = 12, color }: { pct: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/10" />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" initial={{ strokeDasharray: c, strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }} transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }} />
    </svg>
  );
}

// Level system
function getLevel(pct: number): { name: string; icon: typeof Trophy; color: string; bg: string; glow: string; emoji: string } {
  if (pct >= 95) return { name: 'Olmos', icon: Sparkles, color: 'text-cyan-400', bg: 'from-cyan-400 to-blue-500', glow: 'shadow-cyan-500/30', emoji: '💎' };
  if (pct >= 85) return { name: 'Oltin', icon: Trophy, color: 'text-yellow-400', bg: 'from-yellow-400 to-amber-500', glow: 'shadow-yellow-500/30', emoji: '🏆' };
  if (pct >= 70) return { name: 'Kumush', icon: Award, color: 'text-slate-300', bg: 'from-slate-300 to-slate-400', glow: 'shadow-slate-400/30', emoji: '🥈' };
  if (pct >= 50) return { name: 'Bronza', icon: Star, color: 'text-orange-400', bg: 'from-orange-400 to-orange-500', glow: 'shadow-orange-500/30', emoji: '🥉' };
  return { name: 'Yangi', icon: TrendingUp, color: 'text-slate-400', bg: 'from-slate-400 to-slate-500', glow: 'shadow-slate-500/20', emoji: '🌱' };
}

// Motivational quotes
const QUOTES = [
  "Ilm olish har bir musulmonga farzdir.",
  "Bilim — eng kuchli qurol.",
  "Bugun qilgan sa'ying ertangi muvaffaqiyating.",
  "Har bir dars — yangi imkoniyat.",
  "Sabr bilan yoqilgan chiroq so'nmaydi.",
  "Kichik qadamlar katta natijalarga olib keladi.",
  "O'qish — kelajakka sarmoya.",
];

// Confetti particles
function Confetti() {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{ backgroundColor: colors[i % colors.length], left: `${10 + Math.random() * 80}%` }}
          initial={{ top: '-5%', opacity: 1, scale: 1, rotate: 0 }}
          animate={{ top: '110%', opacity: 0, scale: 0.5, rotate: 360 + Math.random() * 360 }}
          transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.8, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

const GROUP_COLORS = [
  { from: 'from-blue-500', to: 'to-cyan-400', accent: '#3b82f6' },
  { from: 'from-violet-500', to: 'to-purple-400', accent: '#8b5cf6' },
  { from: 'from-emerald-500', to: 'to-teal-400', accent: '#10b981' },
  { from: 'from-orange-500', to: 'to-amber-400', accent: '#f97316' },
  { from: 'from-rose-500', to: 'to-pink-400', accent: '#f43f5e' },
];

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };

export default function StudentDashboardPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [debtModal, setDebtModal] = useState(false);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/student/groups').then(r => r.ok ? r.json() : []),
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
      fetch('/api/student/balance').then(r => r.ok ? r.json() : null),
    ]).then(([g, me, bal]) => {
      const arr = Array.isArray(g) ? g : [];
      setGroups(arr);
      if (me?.user) setUser(me.user);
      if (bal && bal.balance < 0) {
        setBalanceData(bal);
        setDebtModal(true);
      }
      setLoading(false);
      // Confetti for 85%+ attendance
      let p = 0, t = 0;
      arr.forEach((gr: Group) => gr.lessons.forEach((l: Lesson) => { if (l.attendances.length > 0) { t++; if (l.attendances[0].present) p++; } }));
      if (t > 0 && (p / t) * 100 >= 85) setTimeout(() => setShowConfetti(true), 800);
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

  const streak = useMemo(() => {
    const allLessons = groups.flatMap(g => g.lessons)
      .filter(l => l.scheduledDate <= today && l.attendances.length > 0)
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
    let count = 0;
    for (const l of allLessons) { if (l.attendances[0].present) count++; else break; }
    return count;
  }, [groups, today]);

  const nextLesson = useMemo(() => {
    let best: { group: Group; lesson: Lesson } | null = null;
    for (const g of groups) {
      for (const l of g.lessons) {
        if (l.scheduledDate >= today && (!best || l.scheduledDate < best.lesson.scheduledDate || (l.scheduledDate === best.lesson.scheduledDate && l.scheduledTime < best.lesson.scheduledTime))) {
          best = { group: g, lesson: l };
        }
      }
    }
    return best;
  }, [groups, today]);

  const isToday = nextLesson?.lesson.scheduledDate === today;
  const totalLessons = groups.reduce((s, g) => s + g._count.lessons, 0);
  const pctColor = stats.pct >= 80 ? '#10b981' : stats.pct >= 50 ? '#f59e0b' : '#ef4444';
  const level = getLevel(stats.pct);
  const LevelIcon = level.icon;

  // Achievements
  const achievements = useMemo(() => {
    const list: { emoji: string; title: string; done: boolean }[] = [
      { emoji: '🎯', title: 'Birinchi dars', done: stats.total > 0 },
      { emoji: '🔥', title: '5 kun streak', done: streak >= 5 },
      { emoji: '⭐', title: '10 ta dars', done: stats.present >= 10 },
      { emoji: '💪', title: '70% davomat', done: stats.pct >= 70 },
      { emoji: '🏆', title: '90% davomat', done: stats.pct >= 90 },
      { emoji: '💎', title: '100% davomat', done: stats.pct === 100 && stats.total > 0 },
    ];
    return list;
  }, [stats, streak]);

  const doneCount = achievements.filter(a => a.done).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6 -mt-2" initial="hidden" animate="visible" variants={stagger}>

      {/* ═══ DEBT MODAL ═══ */}
      <AnimatePresence>
        {debtModal && balanceData && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDebtModal(false)}
          >
            <motion.div
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 p-5 text-white text-center">
                <motion.div
                  className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <AlertTriangle className="w-8 h-8" />
                </motion.div>
                <h2 className="text-xl font-bold">Qarzdorlik mavjud!</h2>
                <p className="text-sm text-white/80 mt-1">Hisobingizda yetarli mablag&apos; yo&apos;q</p>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Balance summary */}
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-800/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Jami to&apos;langan</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {balanceData.totalPaid.toLocaleString()} so&apos;m
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Sarflangan (darslar)</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {balanceData.totalCost.toLocaleString()} so&apos;m
                    </span>
                  </div>
                  <div className="border-t border-red-200 dark:border-red-700/30 pt-2 mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4" /> Qarzdorlik
                    </span>
                    <span className="text-lg font-extrabold text-red-600 dark:text-red-400">
                      {Math.abs(balanceData.balance).toLocaleString()} so&apos;m
                    </span>
                  </div>
                </div>

                {/* Per-group breakdown */}
                {balanceData.groups.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 font-medium">Guruhlar bo&apos;yicha:</p>
                    {balanceData.groups.map(g => (
                      <div key={g.groupId} className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                        <span className="text-slate-600 dark:text-slate-300">{g.groupName}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          {g.attendedLessons} dars = {g.cost.toLocaleString()} so&apos;m
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-slate-400 text-center leading-relaxed">
                  Iltimos, to&apos;lovni amalga oshiring yoki administrator bilan bog&apos;laning.
                </p>

                <button
                  onClick={() => setDebtModal(false)}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold text-sm hover:from-blue-600 hover:to-blue-700 transition-all active:scale-[0.98]"
                >
                  Tushundim
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ HERO BANNER ═══ */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a5f] via-[#1a2e4a] to-[#0f1b2d] p-6 lg:p-8 text-white">
        {showConfetti && <Confetti />}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-cyan-500/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        {/* Floating particles */}
        <motion.div className="absolute top-8 right-20 w-1 h-1 bg-blue-400/40 rounded-full"
          animate={{ y: [-10, 10, -10], opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 4, repeat: Infinity }} />
        <motion.div className="absolute top-16 right-40 w-1.5 h-1.5 bg-cyan-400/30 rounded-full"
          animate={{ y: [10, -10, 10], opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 5, repeat: Infinity }} />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <motion.p className="text-blue-300/70 text-sm font-medium"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              {getGreeting()} {getGreetingEmoji()}
            </motion.p>
            <motion.h1 className="text-2xl lg:text-3xl font-extrabold mt-1"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              {firstName}!
            </motion.h1>
            <motion.p className="text-blue-200/40 text-sm mt-2 italic max-w-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              &ldquo;{quote}&rdquo;
            </motion.p>

            {/* Level badge */}
            {stats.total > 0 && (
              <motion.div className="mt-4 inline-flex items-center gap-2" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}>
                <div className={`flex items-center gap-1.5 bg-gradient-to-r ${level.bg} px-3 py-1.5 rounded-full shadow-lg ${level.glow}`}>
                  <span className="text-sm">{level.emoji}</span>
                  <span className="text-xs font-bold text-white">{level.name} daraja</span>
                </div>
              </motion.div>
            )}

            {/* Stat chips */}
            <div className="flex flex-wrap gap-2.5 mt-4">
              {[
                { icon: Check, value: stats.present, label: 'Keldi', bg: 'bg-emerald-500/20', text: 'text-emerald-400', delay: 0.4 },
                { icon: X, value: stats.absent, label: 'Kelmadi', bg: 'bg-red-500/20', text: 'text-red-400', delay: 0.5 },
                { icon: Flame, value: streak, label: 'Streak', bg: 'bg-orange-500/20', text: 'text-orange-400', delay: 0.6 },
                { icon: BookOpen, value: totalLessons, label: 'Jami', bg: 'bg-blue-500/20', text: 'text-blue-400', delay: 0.7 },
              ].map(chip => (
                <motion.div key={chip.label}
                  className="flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.12] backdrop-blur-sm rounded-xl px-3.5 py-2 cursor-default transition-colors"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: chip.delay }}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <div className={`w-7 h-7 rounded-lg ${chip.bg} flex items-center justify-center`}>
                    <chip.icon className={`w-3.5 h-3.5 ${chip.text}`} />
                  </div>
                  <div>
                    <p className="text-base font-extrabold leading-none"><AnimatedNumber value={chip.value} /></p>
                    <p className="text-[9px] text-blue-200/40 mt-0.5">{chip.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Circle progress */}
          <motion.div className="flex-shrink-0 flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}>
            <div className="relative">
              <CircleProgress pct={stats.total > 0 ? stats.pct : 0} size={140} stroke={12} color={pctColor} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold">
                  <AnimatedNumber value={stats.total > 0 ? stats.pct : 0} />%
                </span>
                <span className="text-[10px] text-blue-200/50 font-semibold">DAVOMAT</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ═══ ACHIEVEMENTS ═══ */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" /> Yutuqlar
            <span className="text-xs font-normal text-slate-400 ml-1">{doneCount}/{achievements.length}</span>
          </h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {achievements.map((a, i) => (
            <motion.div key={a.title}
              className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all cursor-default ${
                a.done
                  ? 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-700/30 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 opacity-50'
              }`}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: a.done ? 1 : 0.5, x: 0 }}
              transition={{ delay: 0.1 * i }} whileHover={{ scale: a.done ? 1.05 : 1 }}>
              <span className={`text-xl ${a.done ? '' : 'grayscale'}`}>{a.emoji}</span>
              <div>
                <p className={`text-xs font-semibold ${a.done ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{a.title}</p>
                {a.done && <p className="text-[9px] text-emerald-500 font-medium">Bajarildi!</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ═══ TODAY / NEXT LESSON ═══ */}
      {nextLesson && (
        <motion.div variants={fadeUp}>
          <Link href={`/dashboard/student/groups/${nextLesson.group.id}`}
            className="block relative overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all group">
            {isToday && (
              <motion.div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 3, repeat: Infinity }} style={{ backgroundSize: '200% 100%' }} />
            )}
            <div className="p-5 bg-white dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center ${
                    isToday ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`} whileHover={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 0.5 }}>
                    <span className="text-lg font-extrabold leading-none">{nextLesson.lesson.scheduledDate.split('-')[2]}</span>
                    <span className="text-[9px] uppercase font-bold mt-0.5 opacity-80">
                      {['','Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'][Number(nextLesson.lesson.scheduledDate.split('-')[1])]}
                    </span>
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {isToday && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                          <motion.span className="w-1.5 h-1.5 rounded-full bg-blue-500"
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                          BUGUN
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{nextLesson.lesson.order}-dars</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{nextLesson.group.name}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {nextLesson.group.subject}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {nextLesson.lesson.scheduledTime}</span>
                      {nextLesson.group.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {nextLesson.group.room}</span>}
                    </div>
                  </div>
                </div>
                <motion.div whileHover={{ x: 4 }}><ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" /></motion.div>
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* ═══ GROUPS GRID ═══ */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" /> Guruhlarim
          </h2>
          {groups.length > 0 && (
            <Link href="/dashboard/student/groups" className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1">
              Barchasi <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {groups.length === 0 ? (
          <motion.div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-16 text-center"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <motion.div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center"
              animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <Users className="w-8 h-8 text-slate-300" />
            </motion.div>
            <p className="text-sm font-semibold text-slate-500">Hozircha guruhlar mavjud emas</p>
            <p className="text-xs text-slate-400 mt-1">Administrator sizni guruhga qo&apos;shganda ko&apos;rinadi</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups.map((group, idx) => {
              const theme = GROUP_COLORS[idx % GROUP_COLORS.length];
              let present = 0, total = 0;
              group.lessons.forEach(l => { if (l.attendances.length > 0) { total++; if (l.attendances[0].present) present++; } });
              const pct = total > 0 ? Math.round((present / total) * 100) : 0;
              const absent = total - present;
              const nextL = group.lessons.find(l => l.scheduledDate >= today);
              const dayLabel = group.dayType === 'toq' ? 'Dush/Chor/Jum' : group.dayType === 'juft' ? 'Sesh/Pay/Shan' : group.schedule;

              return (
                <motion.div key={group.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx, type: 'spring', stiffness: 100 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}>
                  <Link href={`/dashboard/student/groups/${group.id}`}
                    className="block relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-shadow group">
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

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-slate-400 font-medium">Davomat</span>
                          <span className={`text-sm font-extrabold ${total === 0 ? 'text-slate-300' : pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                            {total > 0 ? `${pct}%` : '—'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <motion.div className={`h-2 rounded-full bg-gradient-to-r ${theme.from} ${theme.to}`}
                            initial={{ width: 0 }} animate={{ width: total > 0 ? `${pct}%` : '0%' }}
                            transition={{ duration: 1, delay: 0.2 * idx, ease: 'easeOut' }} />
                        </div>
                        {total > 0 && (
                          <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                            <span className="text-emerald-600 font-semibold flex items-center gap-0.5"><Check className="w-3 h-3" /> {present}</span>
                            <span className="text-red-500 font-semibold flex items-center gap-0.5"><X className="w-3 h-3" /> {absent}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {group.teacher.name}</span>
                        {group.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {group.time}</span>}
                        {dayLabel && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {dayLabel}</span>}
                      </div>

                      {nextL && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
                          <Zap className={`w-3.5 h-3.5 flex-shrink-0 ${nextL.scheduledDate === today ? 'text-blue-500' : 'text-slate-300'}`} />
                          <p className="text-xs truncate">
                            <span className={`font-semibold ${nextL.scheduledDate === today ? 'text-blue-600' : 'text-slate-500 dark:text-slate-300'}`}>
                              {nextL.scheduledDate === today ? 'Bugun' : nextL.scheduledDate.split('-').reverse().join('.')}
                            </span>
                            <span className="text-slate-400"> &middot; {nextL.order}-dars</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
