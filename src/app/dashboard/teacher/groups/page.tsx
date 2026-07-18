'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { teacherNav } from '@/lib/nav';
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
  students: StudentEnrollment[];
  lessons: Lesson[];
  _count: {
    students: number;
    lessons: number;
  };
}

function isLessonActive(date: string, time: string, duration: string): boolean {
  const now = new Date();
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const dur = parseFloat(duration.match(/[\d.]+/)?.[0] || '1.5');
  const end = new Date(start.getTime() + dur * 3600000);
  return now >= start && now <= end;
}

function isSameDay(dateStr: string): boolean {
  const today = new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return today.getFullYear() === y && today.getMonth() + 1 === m && today.getDate() === d;
}

const MONTHS_SHORT: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

const MONTHS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

type TabType = 'davomat' | 'mavzular' | 'topshiriqlar' | 'uyga_vazifalar';

export default function TeacherGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('davomat');
  const [topicInputs, setTopicInputs] = useState<Record<string, string>>({});
  const [savingTopic, setSavingTopic] = useState<string | null>(null);
  const [savingAttendance, setSavingAttendance] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

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

  // Find today's active lesson for timer
  const activeLessonToday = useMemo(() => {
    if (!selectedGroup) return null;
    return selectedGroup.lessons.find(l =>
      isSameDay(l.scheduledDate) && isLessonActive(l.scheduledDate, l.scheduledTime, l.duration)
    ) || null;
  }, [selectedGroup, now]);

  // Get first lesson time for display
  const firstLessonTime = useMemo(() => {
    if (!selectedGroup || selectedGroup.lessons.length === 0) return null;
    return selectedGroup.lessons[0].scheduledTime;
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
    return `${format(first)} – ${format(last)}`;
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
                attendances: [...l.attendances, { id: key, studentId, present }],
              };
            }),
          }))
        );
      }
    } finally {
      setSavingAttendance(null);
    }
  };

  void now;
  void activeLessonToday;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'davomat', label: 'Davomat' },
    { key: 'mavzular', label: 'Mavzular' },
    { key: 'topshiriqlar', label: 'Topshiriqlar' },
    { key: 'uyga_vazifalar', label: 'Uyga vazifalar' },
  ];

  if (loading) {
    return (
      <DashboardLayout navItems={teacherNav} roleLabel="O'qituvchi" roleColor="bg-emerald-100 text-emerald-700">
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Yuklanmoqda...</div>
      </DashboardLayout>
    );
  }

  if (groups.length === 0) {
    return (
      <DashboardLayout navItems={teacherNav} roleLabel="O'qituvchi" roleColor="bg-emerald-100 text-emerald-700">
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Hozircha guruhlar mavjud emas</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      navItems={teacherNav}
      roleLabel="O'qituvchi"
      roleColor="bg-emerald-100 text-emerald-700"
    >
      <div className="flex min-h-[calc(100vh-5rem)]" style={{ marginLeft: '-1rem', marginRight: '-1rem', marginTop: '-1rem' }}>

        {/* ──────── Left Sidebar — dark, narrow ──────── */}
        <div className="w-[80px] bg-[#0f1b2d] flex flex-col items-center py-4 gap-1 flex-shrink-0">
          {groups.map(group => {
            const isActive = group.id === selectedGroupId;
            return (
              <button
                key={group.id}
                onClick={() => {
                  setSelectedGroupId(group.id);
                  setActiveTab('davomat');
                }}
                className={`w-full flex flex-col items-center gap-1 py-3 px-1 text-center transition-all relative ${
                  isActive
                    ? 'bg-[#1a2d47] text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#162438]'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#3b82f6] rounded-r" />
                )}
                <Users className="w-5 h-5" />
                <span className="text-[10px] font-semibold leading-tight truncate w-full px-1">
                  {group.name}
                </span>
              </button>
            );
          })}

          {/* Bottom spacer */}
          <div className="flex-1" />
        </div>

        {/* ──────── Main content ──────── */}
        {selectedGroup && (
          <div className="flex-1 min-w-0 bg-white">

            {/* ── Group Header ── */}
            <div className="border-b border-slate-200 px-6 pt-5 pb-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Left: group name */}
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{selectedGroup.name}</h1>
                  <p className="text-sm text-slate-400 mt-1">
                    O&apos;quvchilar soni: <span className="font-medium text-slate-600">{selectedGroup._count.students}</span>
                  </p>
                </div>

                {/* Right: metadata grid */}
                <div className="flex items-start gap-8 text-sm">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Yo&apos;nalish</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedGroup.subject}</p>
                  </div>
                  {firstLessonTime && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dars vaqti</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{firstLessonTime}</p>
                    </div>
                  )}
                  {selectedGroup.schedule && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dars kunlari</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{selectedGroup.schedule}</p>
                    </div>
                  )}
                  {dateRange && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Muddat</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{dateRange}</p>
                    </div>
                  )}
                  {selectedGroup.meetLink && (
                    <a
                      href={selectedGroup.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-sm"
                    >
                      <Video className="w-4 h-4" />
                      Darsga kirish
                    </a>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Darslar soni</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedGroup._count.lessons}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tabs (underline style) ── */}
            <div className="border-b border-slate-200 px-6">
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
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900 rounded-t" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tab Content ── */}
            {activeTab === 'davomat' && (
              <div>
                {/* Month pills */}
                {availableMonths.length > 0 && (
                  <div className="px-6 py-4 flex items-center gap-2 overflow-x-auto border-b border-slate-100">
                    {availableMonths.map(month => {
                      const [y, m] = month.split('-');
                      const shortM = MONTHS_SHORT[m] || m;
                      const label = `${shortM} ${y.slice(2)}`;
                      const isCurrent = selectedMonth === month;
                      const isCurrentMonth = month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                      return (
                        <button
                          key={month}
                          onClick={() => setSelectedMonth(month)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                            isCurrent
                              ? isCurrentMonth
                                ? 'bg-red-500 text-white border-red-500'
                                : 'bg-slate-800 text-white border-slate-800'
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
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left pl-6 pr-4 py-3 text-xs font-medium text-slate-400 sticky left-0 bg-white z-10 min-w-[250px]">
                            O&apos;quvchilar ro&apos;yxati
                          </th>
                          {filteredLessons.map(lesson => {
                            const [, m, d] = lesson.scheduledDate.split('-');
                            const isToday = isSameDay(lesson.scheduledDate);
                            return (
                              <th
                                key={lesson.id}
                                className="px-2 py-3 text-center min-w-[56px]"
                              >
                                <span className={`text-xs font-medium ${
                                  isToday ? 'text-red-500 font-bold' : 'text-slate-400'
                                }`}>
                                  {d}.{m}
                                </span>
                              </th>
                            );
                          })}
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 min-w-[70px]">
                            Bugun
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 min-w-[80px]">
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
                              className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                            >
                              {/* Student info */}
                              <td className="pl-6 pr-4 py-3 sticky left-0 bg-white z-10">
                                <div className="flex items-center gap-3">
                                  {/* Green dot + number */}
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                      student.status === 'active' ? 'bg-emerald-500' : student.status === 'frozen' ? 'bg-blue-400' : 'bg-slate-300'
                                    }`} />
                                    <span className="text-xs text-slate-400 w-4">{idx + 1}.</span>
                                  </div>
                                  {/* Name + badge */}
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm text-slate-800 truncate">
                                      <span className="font-bold">{student.name.split(' ')[0]}</span>
                                      {' '}
                                      <span className="font-normal">{student.name.split(' ').slice(1).join(' ')}</span>
                                    </span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0 ${
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
                                const active = isLessonActive(lesson.scheduledDate, lesson.scheduledTime, lesson.duration);
                                const savingKey = `${lesson.id}-${student.id}`;
                                const isSaving = savingAttendance === savingKey;

                                return (
                                  <td key={lesson.id} className="px-1 py-2 text-center">
                                    {active ? (
                                      // Active lesson — clickable
                                      record ? (
                                        <button
                                          onClick={() => handleAttendance(lesson.id, student.id, !record.present)}
                                          disabled={isSaving}
                                          className="mx-auto block disabled:opacity-50"
                                        >
                                          {record.present ? (
                                            <div className="w-7 h-7 bg-emerald-500 rounded-md flex items-center justify-center mx-auto">
                                              <Check className="w-4 h-4 text-white stroke-[3]" />
                                            </div>
                                          ) : (
                                            <div className="w-7 h-7 bg-red-100 rounded-md flex items-center justify-center mx-auto">
                                              <span className="text-red-500 text-xs font-bold">✕</span>
                                            </div>
                                          )}
                                        </button>
                                      ) : (
                                        <div className="flex items-center justify-center gap-0.5">
                                          <button
                                            onClick={() => handleAttendance(lesson.id, student.id, true)}
                                            disabled={isSaving}
                                            className="w-7 h-7 border-2 border-emerald-300 rounded-md hover:bg-emerald-50 transition-colors disabled:opacity-50 flex items-center justify-center"
                                          >
                                            <Check className="w-3 h-3 text-emerald-400" />
                                          </button>
                                          <button
                                            onClick={() => handleAttendance(lesson.id, student.id, false)}
                                            disabled={isSaving}
                                            className="w-7 h-7 border-2 border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center"
                                          >
                                            <span className="text-red-300 text-xs">✕</span>
                                          </button>
                                        </div>
                                      )
                                    ) : record ? (
                                      // Past/future with record
                                      record.present ? (
                                        <div className="w-7 h-7 bg-emerald-500 rounded-md flex items-center justify-center mx-auto">
                                          <Check className="w-4 h-4 text-white stroke-[3]" />
                                        </div>
                                      ) : (
                                        <div className="w-7 h-7 bg-red-100 rounded-md flex items-center justify-center mx-auto">
                                          <span className="text-red-500 text-xs font-bold">✕</span>
                                        </div>
                                      )
                                    ) : (
                                      // No record — empty checkbox
                                      <div className="w-7 h-7 border-2 border-slate-200 rounded-md mx-auto" />
                                    )}
                                  </td>
                                );
                              })}

                              {/* Bugun */}
                              <td className="px-4 py-3 text-center">
                                {todayRecord ? (
                                  todayRecord.present ? (
                                    <span className="text-emerald-600 font-semibold text-sm">Keldi</span>
                                  ) : (
                                    <span className="text-red-500 font-semibold text-sm">Yo&apos;q</span>
                                  )
                                ) : (
                                  <span className="text-slate-300 text-sm">—</span>
                                )}
                              </td>

                              {/* Umumiy (overall score) */}
                              <td className="px-4 py-3 text-center">
                                <span className={`text-sm font-bold ${
                                  totalMarked === 0 ? 'text-slate-300'
                                    : (totalPresent / totalMarked) >= 0.8 ? 'text-emerald-600'
                                    : (totalPresent / totalMarked) >= 0.5 ? 'text-amber-600'
                                    : 'text-red-600'
                                }`}>
                                  {totalMarked === 0 ? '—' : `${totalPresent}/${totalMarked}`}
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
                        className={`px-6 py-4 flex items-start gap-4 ${
                          active ? 'bg-emerald-50/50' : isToday ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'
                        } transition-colors`}
                      >
                        {/* Date badge */}
                        <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                          active ? 'bg-emerald-500 text-white'
                            : isToday ? 'bg-blue-500 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          <span className="text-base font-bold leading-none">{d}</span>
                          <span className="text-[9px] uppercase leading-none mt-0.5">
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
                              {lesson.scheduledTime} · {lesson.duration}
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

            {activeTab === 'topshiriqlar' && (
              <div className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">Tez orada qo&apos;shiladi</p>
              </div>
            )}

            {activeTab === 'uyga_vazifalar' && (
              <div className="p-12 text-center">
                <CalendarDays className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">Tez orada qo&apos;shiladi</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
