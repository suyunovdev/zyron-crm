'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users,
  BookOpen,
  CalendarDays,
  Clock,
  UserCheck,
  UserX,
  Pencil,
  Check,
  Video,
  Phone,
  TrendingUp,
  Timer,
  Star,
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  phone: string;
  status: string;
}

interface StudentEnrollment {
  student: Student;
}

interface Attendance {
  id: string;
  studentId: string;
  present: boolean;
  scoreAttend: number;
  scoreHomework: number;
  scoreActivity: number;
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

interface Group {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  meetLink?: string;
  room?: string;
  dayType?: string;
  time?: string;
  students: StudentEnrollment[];
  lessons: Lesson[];
  _count: {
    students: number;
    lessons: number;
  };
}

function tzNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
}

function isLessonActive(date: string, time: string, duration: string): boolean {
  const now = tzNow();
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const dur = parseFloat(duration.match(/[\d.]+/)?.[0] || '1.5');
  const end = new Date(start.getTime() + dur * 3600000);
  return now >= start && now <= end;
}

// Davomat belgilash oynasi: dars boshlanishidan 15 min oldin va tugashidan 15 min keyin
function isAttendanceWindowOpen(date: string, time: string, duration: string): boolean {
  const now = tzNow();
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const dur = parseFloat(duration.match(/[\d.]+/)?.[0] || '1.5');
  const end = new Date(start.getTime() + dur * 3600000);
  const windowStart = new Date(start.getTime() - 15 * 60000);
  const windowEnd = new Date(end.getTime() + 15 * 60000);
  return now >= windowStart && now <= windowEnd;
}

function isSameDay(dateStr: string): boolean {
  const today = tzNow();
  const [y, m, d] = dateStr.split('-').map(Number);
  return today.getFullYear() === y && today.getMonth() + 1 === m && today.getDate() === d;
}

const MONTHS_SHORT: Record<string, string> = {
  '01': 'Yan', '02': 'Fev', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Iyn', '07': 'Iyl', '08': 'Avg',
  '09': 'Sen', '10': 'Okt', '11': 'Noy', '12': 'Dek',
};

const MONTHS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

type TabType = 'davomat' | 'baholash' | 'mavzular';

export default function TeacherGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('davomat');
  const [topicInputs, setTopicInputs] = useState<Record<string, string>>({});
  const [savingTopic, setSavingTopic] = useState<string | null>(null);
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [now, setNow] = useState(tzNow());
  const [teacherName, setTeacherName] = useState('');
  const [timerStr, setTimerStr] = useState('00:00:00');
  const monthScrollRef = useRef<HTMLDivElement>(null);

  // Update clock every second for timer
  useEffect(() => {
    const interval = setInterval(() => setNow(tzNow()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch teacher name
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user?.name) setTeacherName(data.user.name);
      })
      .catch(() => {});
  }, []);

  // Get teacher initials like "Ilyos.S"
  const teacherInitials = useMemo(() => {
    if (!teacherName) return '';
    const parts = teacherName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]}.${parts[1][0]}`;
    }
    return parts[0];
  }, [teacherName]);

  const fetchGroups = useCallback(() => {
    fetch('/api/teacher/groups')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setGroups(arr);
        if (arr.length > 0 && !selectedGroupId) {
          setSelectedGroupId(arr[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) || null;

  // Get available months from lessons
  const availableMonths = useMemo(() => {
    if (!selectedGroup) return [];
    const monthSet = new Set<string>();
    selectedGroup.lessons.forEach(l => {
      const [y, m] = l.scheduledDate.split('-');
      monthSet.add(`${y}-${m}`);
    });
    return Array.from(monthSet).sort();
  }, [selectedGroup]);

  // Auto-select current month or last available
  useEffect(() => {
    if (availableMonths.length === 0) {
      setSelectedMonth('');
      return;
    }
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (availableMonths.includes(currentMonth)) {
      setSelectedMonth(currentMonth);
    } else {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId, availableMonths.length]);

  // Filter lessons by selected month
  const filteredLessons = useMemo(() => {
    if (!selectedGroup || !selectedMonth) return [];
    return selectedGroup.lessons.filter(l => {
      const [y, m] = l.scheduledDate.split('-');
      return `${y}-${m}` === selectedMonth;
    }).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.order - b.order);
  }, [selectedGroup, selectedMonth]);

  // Live timer for active lesson
  const activeLessonToday = useMemo(() => {
    if (!selectedGroup) return null;
    return selectedGroup.lessons.find(l =>
      isSameDay(l.scheduledDate) && isLessonActive(l.scheduledDate, l.scheduledTime, l.duration)
    ) || null;
  }, [selectedGroup, now]);

  useEffect(() => {
    if (!activeLessonToday) {
      setTimerStr('00:00:00');
      return;
    }
    const [y, mo, d] = activeLessonToday.scheduledDate.split('-').map(Number);
    const [h, min] = activeLessonToday.scheduledTime.split(':').map(Number);
    const start = new Date(y, mo - 1, d, h, min);
    const elapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
    const hrs = Math.floor(elapsed / 3600);
    const mins = Math.floor((elapsed % 3600) / 60);
    const secs = elapsed % 60;
    setTimerStr(`${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
  }, [activeLessonToday, now]);

  // Get first lesson time for display
  const lessonTime = useMemo(() => {
    if (!selectedGroup) return null;
    if (selectedGroup.time) return selectedGroup.time;
    if (selectedGroup.lessons.length === 0) return null;
    return selectedGroup.lessons[0].scheduledTime;
  }, [selectedGroup]);

  // Get day type label
  const dayTypeLabel = useMemo(() => {
    if (!selectedGroup) return null;
    if (selectedGroup.dayType === 'toq') return 'Toq';
    if (selectedGroup.dayType === 'juft') return 'Juft';
    if (selectedGroup.schedule) return selectedGroup.schedule;
    return null;
  }, [selectedGroup]);

  // Get date range
  const dateRange = useMemo(() => {
    if (!selectedGroup || selectedGroup.lessons.length === 0) return null;
    const sorted = [...selectedGroup.lessons].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    const first = sorted[0].scheduledDate;
    const last = sorted[sorted.length - 1].scheduledDate;
    const format = (d: string) => {
      const [y, m, day] = d.split('-');
      return `${day}.${m}.${y}`;
    };
    return `${format(first)} \u2013 ${format(last)}`;
  }, [selectedGroup]);

  const handleTopicSave = async (lessonId: string) => {
    const topic = topicInputs[lessonId]?.trim();
    if (!topic) return;
    setSavingTopic(lessonId);
    try {
      const res = await fetch('/api/teacher/lessons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, topic }),
      });
      if (res.ok) {
        setGroups(prev =>
          prev.map(g => ({
            ...g,
            lessons: g.lessons.map(l =>
              l.id === lessonId ? { ...l, topic } : l
            ),
          }))
        );
        setTopicInputs(prev => {
          const next = { ...prev };
          delete next[lessonId];
          return next;
        });
      }
    } finally {
      setSavingTopic(null);
    }
  };

  const handleAttendance = async (lessonId: string, studentId: string, present: boolean) => {
    const key = `${lessonId}-${studentId}`;
    setSavingAttendance(key);
    try {
      const res = await fetch('/api/teacher/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, studentId, present }),
      });
      if (res.ok) {
        setGroups(prev =>
          prev.map(g => ({
            ...g,
            lessons: g.lessons.map(l => {
              if (l.id !== lessonId) return l;
              const existing = l.attendances.find(a => a.studentId === studentId);
              if (existing) {
                return {
                  ...l,
                  attendances: l.attendances.map(a =>
                    a.studentId === studentId ? { ...a, present } : a
                  ),
                };
              }
              return {
                ...l,
                attendances: [...l.attendances, { id: key, studentId, present, scoreAttend: 0, scoreHomework: 0, scoreActivity: 0 }],
              };
            }),
          }))
        );
      }
    } finally {
      setSavingAttendance(null);
    }
  };

  // Check if attendance window is open for this lesson
  const isLessonEditable = (lesson: Lesson): boolean => {
    return isAttendanceWindowOpen(lesson.scheduledDate, lesson.scheduledTime, lesson.duration);
  };

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [savingScore, setSavingScore] = useState<string | null>(null);

  const handleScore = async (lessonId: string, studentId: string, field: 'scoreAttend' | 'scoreHomework' | 'scoreActivity', value: number) => {
    const key = `${lessonId}-${studentId}-${field}`;
    setSavingScore(key);
    try {
      const lesson = selectedGroup?.lessons.find(l => l.id === lessonId);
      const existing = lesson?.attendances.find(a => a.studentId === studentId);
      const res = await fetch('/api/teacher/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          studentId,
          present: existing?.present ?? true,
          [field]: value,
        }),
      });
      if (res.ok) {
        setGroups(prev =>
          prev.map(g => ({
            ...g,
            lessons: g.lessons.map(l => {
              if (l.id !== lessonId) return l;
              const ex = l.attendances.find(a => a.studentId === studentId);
              if (ex) {
                return { ...l, attendances: l.attendances.map(a => a.studentId === studentId ? { ...a, [field]: value } : a) };
              }
              return { ...l, attendances: [...l.attendances, { id: key, studentId, present: true, scoreAttend: 0, scoreHomework: 0, scoreActivity: 0, [field]: value }] };
            }),
          }))
        );
      }
    } finally {
      setSavingScore(null);
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'davomat', label: 'Davomat' },
    { key: 'baholash', label: 'Baholash' },
    { key: 'mavzular', label: 'Mavzular' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Yuklanmoqda...</div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Hozircha guruhlar mavjud emas</div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)]" style={{ marginLeft: '-1rem', marginRight: '-1rem', marginTop: '-1rem' }}>

      {/* ──────── Left Sidebar — dark group list ──────── */}
      <div className="w-[72px] bg-[#0f1b2d] flex flex-col items-center py-3 gap-0.5 flex-shrink-0 overflow-y-auto">
        {groups.map(group => {
          const isActive = group.id === selectedGroupId;
          return (
            <button
              key={group.id}
              onClick={() => {
                setSelectedGroupId(group.id);
                setActiveTab('davomat');
              }}
              className={`w-full flex flex-col items-center gap-0.5 py-2.5 px-1 text-center transition-all relative ${
                isActive
                  ? 'bg-[#1a2d47] text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#162438]'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#3b82f6] rounded-r" />
              )}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isActive ? 'bg-blue-500/20' : 'bg-white/5'
              }`}>
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-semibold leading-tight truncate w-full px-0.5">
                {group.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* ──────── Main content ──────── */}
      {selectedGroup && (
        <div className="flex-1 min-w-0 bg-white flex flex-col">

          {/* ── Group Header ── */}
          <div className="border-b border-slate-200 px-5 pt-4 pb-3">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{selectedGroup.name}</h1>
                {activeLessonToday && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <Timer className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-sm font-mono font-bold text-emerald-700">{timerStr}</span>
                  </div>
                )}
                {!activeLessonToday && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                    <Timer className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-sm font-mono text-slate-400">00:00:00</span>
                  </div>
                )}
              </div>
              {selectedGroup.meetLink && (
                <a
                  href={selectedGroup.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-sm flex-shrink-0"
                >
                  <Video className="w-4 h-4" />
                  Darsga kirish
                </a>
              )}
            </div>

            {/* Metadata grid */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Yo&apos;nalish</span>
                <p className="font-semibold text-slate-800">{selectedGroup.subject}</p>
              </div>
              {lessonTime && (
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dars vaqti</span>
                  <p className="font-semibold text-slate-800">{lessonTime}</p>
                </div>
              )}
              {dayTypeLabel && (
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dars kunlari</span>
                  <p className="font-semibold text-slate-800">{dayTypeLabel}</p>
                </div>
              )}
              {selectedGroup.room && (
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dars xonasi</span>
                  <p className="font-semibold text-slate-800">{selectedGroup.room}</p>
                </div>
              )}
              {dateRange && (
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Muddat</span>
                  <p className="font-semibold text-slate-800">{dateRange}</p>
                </div>
              )}
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Darslar soni</span>
                <p className="font-semibold text-slate-800">{selectedGroup._count.lessons}</p>
              </div>
            </div>
          </div>

          {/* ── Tabs (Mars CRM style) ── */}
          <div className="border-b border-slate-200 px-5">
            <div className="flex gap-0">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-3 text-sm font-medium transition-all relative ${
                    activeTab === tab.key
                      ? 'text-slate-900'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2660A4] rounded-t" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab Content ── */}
          <div className="flex-1 min-h-0 overflow-auto">
            {activeTab === 'davomat' && (
              <div>
                {/* Month pills */}
                {availableMonths.length > 0 && (
                  <div
                    ref={monthScrollRef}
                    className="px-5 py-3 flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 scrollbar-thin"
                  >
                    {availableMonths.map(month => {
                      const [y, m] = month.split('-');
                      const shortM = MONTHS_SHORT[m] || m;
                      const label = `${shortM} ${y.slice(2)}`;
                      const isCurrent = selectedMonth === month;
                      const isCurrentMonth = month === currentMonthKey;

                      return (
                        <button
                          key={month}
                          onClick={() => setSelectedMonth(month)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                            isCurrent
                              ? isCurrentMonth
                                ? 'bg-red-500 text-white border-red-500 shadow-sm'
                                : 'bg-slate-800 text-white border-slate-800 shadow-sm'
                              : isCurrentMonth
                                ? 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 bg-white'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Attendance table */}
                {filteredLessons.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-400">
                    Bu oyda darslar mavjud emas
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left pl-5 pr-3 py-2.5 text-xs font-semibold text-slate-500 sticky left-0 bg-white z-10 min-w-[220px]">
                            O&apos;quvchilar ro&apos;yxati
                          </th>
                          {filteredLessons.map(lesson => {
                            const [, m, d] = lesson.scheduledDate.split('-');
                            const isToday = isSameDay(lesson.scheduledDate);
                            const editable = isLessonEditable(lesson);
                            return (
                              <th
                                key={lesson.id}
                                className={`px-1 py-2 text-center min-w-[52px] ${
                                  isToday ? 'bg-cyan-50' : ''
                                }`}
                              >
                                <div className={`text-[11px] font-bold leading-tight ${
                                  isToday ? 'text-cyan-600' : editable ? 'text-slate-600' : 'text-slate-300'
                                }`}>
                                  {d}.{m}
                                </div>
                                {teacherInitials && (
                                  <div className={`text-[9px] font-medium leading-tight mt-0.5 ${
                                    isToday ? 'text-cyan-500' : editable ? 'text-slate-400' : 'text-slate-300'
                                  }`}>
                                    {teacherInitials}
                                  </div>
                                )}
                              </th>
                            );
                          })}
                          <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 min-w-[60px] bg-emerald-50/50">
                            Bugun
                          </th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 min-w-[65px]">
                            Umumiy
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedGroup.students.map(({ student }, idx) => {
                          // Calculate overall attendance
                          let totalPresent = 0;
                          let totalMarked = 0;
                          selectedGroup.lessons.forEach(l => {
                            const rec = l.attendances.find(a => a.studentId === student.id);
                            if (rec) {
                              totalMarked++;
                              if (rec.present) totalPresent++;
                            }
                          });

                          // Today's attendance
                          const todayLesson = filteredLessons.find(l => isSameDay(l.scheduledDate));
                          const todayRecord = todayLesson?.attendances.find(a => a.studentId === student.id);

                          return (
                            <tr
                              key={student.id}
                              className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors"
                            >
                              {/* Student info */}
                              <td className="pl-5 pr-3 py-2 sticky left-0 bg-white z-10">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                      student.status === 'active' ? 'bg-emerald-500' : student.status === 'frozen' ? 'bg-blue-400' : 'bg-slate-300'
                                    }`} />
                                    <span className="text-[11px] text-slate-400 w-4">{idx + 1}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-[13px] text-slate-800 truncate">
                                      <span className="font-bold">{student.name.split(' ')[0]}</span>
                                      {' '}
                                      <span className="font-normal text-slate-600">{student.name.split(' ').slice(1).join(' ')}</span>
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                                      student.status === 'active'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : student.status === 'frozen'
                                        ? 'bg-blue-100 text-blue-600'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {student.status === 'active' ? 'Aktiv' : student.status === 'frozen' ? 'Muzlatilgan' : 'Arxiv'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Attendance cells per date */}
                              {filteredLessons.map(lesson => {
                                const record = lesson.attendances.find(a => a.studentId === student.id);
                                const editable = isLessonEditable(lesson);
                                const isToday = isSameDay(lesson.scheduledDate);
                                const savingKey = `${lesson.id}-${student.id}`;
                                const isSaving = savingAttendance === savingKey;

                                return (
                                  <td key={lesson.id} className={`px-0.5 py-1.5 text-center ${
                                    isToday ? 'bg-cyan-50' : ''
                                  }`}>
                                    {editable ? (
                                      record ? (
                                        <button
                                          onClick={() => handleAttendance(lesson.id, student.id, !record.present)}
                                          disabled={isSaving}
                                          className="mx-auto block disabled:opacity-50"
                                        >
                                          {record.present ? (
                                            <div className="w-7 h-7 bg-emerald-500 rounded flex items-center justify-center mx-auto hover:bg-emerald-600 transition-colors">
                                              <Check className="w-4 h-4 text-white stroke-[3]" />
                                            </div>
                                          ) : (
                                            <div className="w-7 h-7 bg-red-500 rounded flex items-center justify-center mx-auto hover:bg-red-600 transition-colors">
                                              <span className="text-white text-xs font-bold">Y</span>
                                            </div>
                                          )}
                                        </button>
                                      ) : (
                                        <div className="flex items-center justify-center gap-px">
                                          <button
                                            onClick={() => handleAttendance(lesson.id, student.id, true)}
                                            disabled={isSaving}
                                            className="w-7 h-7 border-2 border-emerald-300 rounded hover:bg-emerald-50 transition-colors disabled:opacity-50 flex items-center justify-center"
                                          >
                                            <Check className="w-3 h-3 text-emerald-400" />
                                          </button>
                                          <button
                                            onClick={() => handleAttendance(lesson.id, student.id, false)}
                                            disabled={isSaving}
                                            className="w-7 h-7 border-2 border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center"
                                          >
                                            <span className="text-red-300 text-[10px] font-bold">Y</span>
                                          </button>
                                        </div>
                                      )
                                    ) : (
                                      <div className="w-7 h-7 border border-dashed border-slate-200 rounded mx-auto" />
                                    )}
                                  </td>
                                );
                              })}

                              {/* Bugun */}
                              <td className="px-3 py-2 text-center bg-emerald-50/50">
                                {todayRecord ? (
                                  todayRecord.present ? (
                                    <span className="text-emerald-600 font-bold text-sm">+</span>
                                  ) : (
                                    <span className="text-red-500 font-bold text-sm">Y</span>
                                  )
                                ) : (
                                  <span className="text-slate-300 text-sm">&mdash;</span>
                                )}
                              </td>

                              {/* Umumiy */}
                              <td className="px-3 py-2 text-center">
                                <span className={`text-sm font-bold ${
                                  totalMarked === 0 ? 'text-slate-300'
                                    : (totalPresent / totalMarked) >= 0.8 ? 'text-emerald-600'
                                    : (totalPresent / totalMarked) >= 0.5 ? 'text-amber-600'
                                    : 'text-red-600'
                                }`}>
                                  {totalMarked === 0 ? '\u2014' : `${totalPresent}/${totalMarked}`}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'mavzular' && (
              <div className="divide-y divide-slate-100">
                {selectedGroup.lessons.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-400">
                    Darslar mavjud emas
                  </div>
                ) : (
                  selectedGroup.lessons.map(lesson => {
                    const active = isLessonActive(lesson.scheduledDate, lesson.scheduledTime, lesson.duration);
                    const topicDraft = topicInputs[lesson.id] ?? '';
                    const [, m, d] = lesson.scheduledDate.split('-').map(Number);
                    const isToday = isSameDay(lesson.scheduledDate);

                    return (
                      <div
                        key={lesson.id}
                        className={`px-5 py-3.5 flex items-start gap-3.5 ${
                          active ? 'bg-emerald-50/50' : isToday ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'
                        } transition-colors`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                          active ? 'bg-emerald-500 text-white'
                            : isToday ? 'bg-blue-500 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          <span className="text-sm font-bold leading-none">{d}</span>
                          <span className="text-[8px] uppercase leading-none mt-0.5">
                            {MONTHS_UZ[m - 1].slice(0, 3)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-blue-600">
                              {lesson.order}-dars
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {lesson.scheduledTime} &middot; {lesson.duration}
                            </span>
                            {active && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                Jonli
                              </span>
                            )}
                          </div>

                          {lesson.topic ? (
                            <p className="text-sm text-slate-800 font-medium flex items-center gap-1.5">
                              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              {lesson.topic}
                            </p>
                          ) : (
                            <div>
                              <p className="text-xs text-amber-600 font-semibold mb-1.5 flex items-center gap-1">
                                <Pencil className="w-3 h-3" />
                                Mavzu kiritilmagan
                              </p>
                              <div className="flex gap-2 max-w-md">
                                <input
                                  type="text"
                                  value={topicDraft}
                                  onChange={e =>
                                    setTopicInputs(prev => ({
                                      ...prev,
                                      [lesson.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleTopicSave(lesson.id);
                                  }}
                                  placeholder="Mavzuni kiriting..."
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-blue-400 bg-white"
                                />
                                <button
                                  onClick={() => handleTopicSave(lesson.id)}
                                  disabled={!topicDraft.trim() || savingTopic === lesson.id}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                >
                                  {savingTopic === lesson.id ? '...' : 'Saqlash'}
                                </button>
                              </div>
                            </div>
                          )}

                          {lesson.attendances.length > 0 && (
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="flex items-center gap-1 text-emerald-600">
                                <UserCheck className="w-3.5 h-3.5" />
                                {lesson.attendances.filter(a => a.present).length} keldi
                              </span>
                              <span className="flex items-center gap-1 text-red-500">
                                <UserX className="w-3.5 h-3.5" />
                                {lesson.attendances.filter(a => !a.present).length} kelmadi
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'baholash' && (
              <div>
                {/* Month pills */}
                {availableMonths.length > 0 && (
                  <div className="px-5 py-3 flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 scrollbar-thin">
                    {availableMonths.map(month => {
                      const [y, m] = month.split('-');
                      const shortM = MONTHS_SHORT[m] || m;
                      const label = `${shortM} ${y.slice(2)}`;
                      const isCurrent = selectedMonth === month;
                      const isCurrentMonth = month === currentMonthKey;
                      return (
                        <button key={month} onClick={() => setSelectedMonth(month)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                            isCurrent
                              ? isCurrentMonth ? 'bg-red-500 text-white border-red-500 shadow-sm' : 'bg-slate-800 text-white border-slate-800 shadow-sm'
                              : isCurrentMonth ? 'border-red-200 text-red-500 bg-red-50 hover:bg-red-100' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 bg-white'
                          }`}>{label}</button>
                      );
                    })}
                  </div>
                )}

                {filteredLessons.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-400">Bu oyda darslar mavjud emas</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredLessons.map(lesson => {
                      const [, m, d] = lesson.scheduledDate.split('-');
                      const isToday = isSameDay(lesson.scheduledDate);
                      const editable = isLessonEditable(lesson);

                      return (
                        <div key={lesson.id} className={`${isToday ? 'bg-cyan-50/30' : ''}`}>
                          <div className="px-5 py-2.5 flex items-center gap-2 border-b border-slate-50 bg-slate-50/50">
                            <span className={`text-xs font-bold ${isToday ? 'text-cyan-600' : 'text-slate-500'}`}>
                              {d}.{m} &middot; {lesson.order}-dars
                            </span>
                            <span className="text-[10px] text-slate-400">{lesson.scheduledTime}</span>
                            {lesson.topic && <span className="text-[10px] text-slate-400 truncate">&middot; {lesson.topic}</span>}
                            {!editable && <span className="text-[9px] text-slate-300 ml-auto">Muddati o&apos;tgan</span>}
                          </div>
                          <div className="divide-y divide-slate-50">
                            {selectedGroup.students.map(({ student }) => {
                              const record = lesson.attendances.find(a => a.studentId === student.id);
                              const sa = record?.scoreAttend ?? 0;
                              const sh = record?.scoreHomework ?? 0;
                              const sact = record?.scoreActivity ?? 0;
                              const total = sa + sh + sact;

                              return (
                                <div key={student.id} className="px-5 py-2 flex items-center gap-4">
                                  <div className="w-40 flex-shrink-0">
                                    <span className="text-[13px] text-slate-800 font-medium">{student.name}</span>
                                  </div>
                                  {/* Qatnashish */}
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-[9px] text-slate-400 font-medium">Qatnashish</span>
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3, 4, 5].map(v => (
                                        <button key={v}
                                          disabled={!editable || savingScore === `${lesson.id}-${student.id}-scoreAttend`}
                                          onClick={() => handleScore(lesson.id, student.id, 'scoreAttend', v === sa ? 0 : v)}
                                          className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${
                                            v <= sa ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                          } ${!editable ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >{v}</button>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Uyga vazifa */}
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-[9px] text-slate-400 font-medium">Uyga vazifa</span>
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3, 4, 5].map(v => (
                                        <button key={v}
                                          disabled={!editable || savingScore === `${lesson.id}-${student.id}-scoreHomework`}
                                          onClick={() => handleScore(lesson.id, student.id, 'scoreHomework', v === sh ? 0 : v)}
                                          className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${
                                            v <= sh ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                          } ${!editable ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >{v}</button>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Faollik */}
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-[9px] text-slate-400 font-medium">Faollik</span>
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3, 4, 5].map(v => (
                                        <button key={v}
                                          disabled={!editable || savingScore === `${lesson.id}-${student.id}-scoreActivity`}
                                          onClick={() => handleScore(lesson.id, student.id, 'scoreActivity', v === sact ? 0 : v)}
                                          className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${
                                            v <= sact ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                          } ${!editable ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >{v}</button>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Jami */}
                                  <div className="flex flex-col items-center gap-0.5 ml-auto">
                                    <span className="text-[9px] text-slate-400 font-medium">Jami</span>
                                    <span className={`text-lg font-extrabold ${
                                      total >= 12 ? 'text-emerald-600' : total >= 8 ? 'text-blue-600' : total > 0 ? 'text-amber-600' : 'text-slate-300'
                                    }`}>{total}<span className="text-[10px] text-slate-400 font-normal">/15</span></span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
