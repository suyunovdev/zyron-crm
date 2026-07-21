'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';

interface AttendanceLesson {
  id: string;
  topic: string | null;
  scheduledDate: string;
  scheduledTime: string;
  groupId: string;
}

interface Attendance {
  id: string;
  present: boolean;
  markedAt: string;
  lesson: AttendanceLesson;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = [
    'yan', 'fev', 'mar', 'apr', 'may', 'iyn',
    'iyl', 'avg', 'sen', 'okt', 'noy', 'dek',
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatScheduledDate(date: string): string {
  if (!date) return '—';
  const [y, m, d] = date.split('-').map(Number);
  const months = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

export default function StudentAttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/attendance')
      .then(res => res.ok ? res.json() : [])
      .then(data => setAttendances(data))
      .finally(() => setLoading(false));
  }, []);

  const total = attendances.length;
  const attended = attendances.filter(a => a.present).length;
  const absent = attendances.filter(a => !a.present).length;
  const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

  const summaryCards = [
    {
      label: 'Kelgan darslar',
      value: attended,
      icon: CheckCircle2,
      color: 'bg-green-100 text-green-600',
      textColor: 'text-green-700',
    },
    {
      label: 'Kelmagan darslar',
      value: absent,
      icon: XCircle,
      color: 'bg-red-100 text-red-500',
      textColor: 'text-red-600',
    },
    {
      label: 'Davomat foizi',
      value: `${percentage}%`,
      icon: TrendingUp,
      color: percentage >= 80 ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600',
      textColor: percentage >= 80 ? 'text-indigo-700' : 'text-amber-700',
    },
  ];

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Davomatim</h1>
          <p className="text-slate-500 mt-1">Dars tashrif va qatnashuv statistikasi</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {summaryCards.map(card => (
            <div key={card.label} className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className={`w-12 h-12 ${card.color.split(' ')[0]} rounded-2xl flex items-center justify-center mb-4`}>
                <card.icon className={`w-6 h-6 ${card.color.split(' ')[1]}`} />
              </div>
              <p className={`text-3xl font-bold ${card.textColor}`}>
                {loading ? '—' : card.value}
              </p>
              <p className="text-sm text-slate-500 mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Attendance percentage bar */}
        {!loading && total > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700">Umumiy davomat</span>
              <span className={`text-sm font-bold ${percentage >= 80 ? 'text-indigo-600' : 'text-amber-600'}`}>
                {percentage}% ({attended}/{total})
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${percentage >= 80 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            {percentage < 80 && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                Tavsiya: kamida 80% davomatni saqlang
              </p>
            )}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-500" />
              Davomat jadvali
            </h3>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                  <div className="h-4 w-28 bg-slate-200 rounded" />
                  <div className="h-4 w-16 bg-slate-100 rounded" />
                  <div className="h-4 flex-1 bg-slate-100 rounded" />
                  <div className="h-6 w-20 bg-slate-200 rounded-full" />
                </div>
              ))}
            </div>
          ) : attendances.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Davomat ma&apos;lumotlari mavjud emas</p>
              <p className="text-slate-400 text-sm mt-1">O&apos;qituvchi davomat belgilaganda bu yerda ko&apos;rinadi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sana</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vaqt</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mavzu</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Holat</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Belgilangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendances.map(attendance => {
                    const isPresent = attendance.present;
                    return (
                      <tr key={attendance.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-700 font-medium whitespace-nowrap">
                          {formatScheduledDate(attendance.lesson.scheduledDate)}
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {attendance.lesson.scheduledTime || '—'}
                        </td>
                        <td className="px-6 py-4 text-slate-700 max-w-xs">
                          {attendance.lesson.topic ? (
                            <span className="truncate block">{attendance.lesson.topic}</span>
                          ) : (
                            <span className="text-slate-400 italic">Mavzu yozilmagan</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            isPresent
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {isPresent
                              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Keldi</>
                              : <><XCircle className="w-3.5 h-3.5" /> Kelmadi</>
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap">
                          {formatDate(attendance.markedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
