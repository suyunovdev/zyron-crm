'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UsersRound, ChevronDown, ChevronUp, Video, Clock, Users, ExternalLink } from 'lucide-react';
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

function isLessonActive(date: string, time: string, duration: string): boolean {
  const now = new Date();
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const dur = parseFloat(duration.match(/[\d.]+/)?.[0] || '1.5');
  const end = new Date(start.getTime() + dur * 3600000);
  return now >= start && now <= end;
}

function isLessonPast(date: string, time: string, duration: string): boolean {
  const now = new Date();
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const dur = parseFloat(duration.match(/[\d.]+/)?.[0] || '1.5');
  const end = new Date(start.getTime() + dur * 3600000);
  return now > end;
}

function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const months = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

function GroupCard({ group }: { group: Group }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all">
      {/* Group header */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="w-full text-left p-6 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <UsersRound className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{group.name}</h3>
              <p className="text-sm text-indigo-600 font-medium">{group.subject}</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                <span>O&apos;qituvchi: <span className="font-medium text-slate-700">{group.teacher.name}</span></span>
                {group.schedule && <span>Jadval: <span className="font-medium text-slate-700">{group.schedule}</span></span>}
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {group._count.students} ta o&apos;quvchi
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
              {group.lessons.length} dars
            </span>
            {expanded
              ? <ChevronUp className="w-5 h-5 text-slate-400" />
              : <ChevronDown className="w-5 h-5 text-slate-400" />
            }
          </div>
        </div>
      </button>

      {/* Lesson list */}
      {expanded && (
        <div className="border-t border-slate-100">
          {group.lessons.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">
              Hozircha darslar mavjud emas
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {group.lessons.map(lesson => {
                const active = isLessonActive(lesson.scheduledDate, lesson.scheduledTime, lesson.duration);
                const past = isLessonPast(lesson.scheduledDate, lesson.scheduledTime, lesson.duration);

                return (
                  <li key={lesson.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold
                        ${active ? 'bg-green-100 text-green-700' : past ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                        {lesson.order}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${lesson.topic ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                          {lesson.topic ?? 'Mavzu hali yozilmagan'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(lesson.scheduledDate)} — {lesson.scheduledTime}
                          {lesson.duration && <span className="ml-1 text-slate-400">({lesson.duration})</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {active ? (
                        <a
                          href={group.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-green-200"
                        >
                          <Video className="w-4 h-4" />
                          Darsga qo&apos;shilish
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : past ? (
                        <span className="text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1.5 rounded-xl">
                          Dars o&apos;tdi
                        </span>
                      ) : (
                        <span className="text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-xl">
                          Dars boshlanmagan
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/groups')
      .then(res => res.ok ? res.json() : [])
      .then(data => setGroups(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout navItems={studentNav} roleLabel="O'quvchi" roleColor="bg-blue-100 text-blue-700">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Guruhlarim</h1>
          <p className="text-slate-500 mt-1">Siz a&apos;zo bo&apos;lgan guruhlar va darslar ro&apos;yxati</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/3 bg-slate-200 rounded" />
                    <div className="h-3 w-1/4 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <UsersRound className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold text-lg">Hech qanday guruh topilmadi</p>
            <p className="text-slate-400 text-sm mt-2">
              Administrator sizi guruhga qo&apos;shganda darslar bu yerda ko&apos;rinadi
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(group => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
