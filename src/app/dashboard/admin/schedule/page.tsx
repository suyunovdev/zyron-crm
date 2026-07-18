'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { adminNav } from '@/lib/nav';
import { Loader2, Users } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  subject: string;
  status: string;
  mode?: string;
  room?: string;
  dayType?: string;
  time?: string;
  startDate?: string;
  teacher: { id: string; name: string } | null;
  _count: { students: number };
}

const ROOMS = Array.from({ length: 10 }, (_, i) => `Room ${i + 1}`);

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
];

const DAY_TYPES = [
  { value: 'toq', label: 'Toq kunlar' },
  { value: 'juft', label: 'Juft kunlar' },
  { value: 'boshqa', label: 'Boshqa' },
];

export default function SchedulePage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDayType, setActiveDayType] = useState('toq');
  const [activeMode, setActiveMode] = useState<'offline' | 'online'>('offline');

  useEffect(() => {
    fetch('/api/admin/groups')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const active = Array.isArray(data) ? data.filter((g: Group) => g.status === 'active') : [];
        setGroups(active);
        if (active.length > 0) {
          const hasOffline = active.some((g: Group) => (g.mode || 'offline') === 'offline');
          const hasOnline = active.some((g: Group) => g.mode === 'online');
          if (!hasOffline && hasOnline) setActiveMode('online');
          const hasDT = (dt: string) => active.some((g: Group) => (g.dayType || 'toq') === dt);
          if (!hasDT('toq') && hasDT('juft')) setActiveDayType('juft');
          else if (!hasDT('toq') && !hasDT('juft') && hasDT('boshqa')) setActiveDayType('boshqa');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredGroups = useMemo(() => {
    return groups.filter(g =>
      (g.mode || 'offline') === activeMode &&
      (g.dayType || 'toq') === activeDayType &&
      g.time
    );
  }, [groups, activeMode, activeDayType]);

  // All time slots from all groups in this mode (across all day types) for consistent columns
  const allTimeSlots = useMemo(() => {
    const times = new Set<string>(TIME_SLOTS);
    groups
      .filter(g => (g.mode || 'offline') === activeMode && g.time)
      .forEach(g => times.add(g.time!));
    return Array.from(times).sort();
  }, [groups, activeMode]);

  const rows = useMemo(() => {
    const roomSet = new Set<string>(ROOMS);
    filteredGroups.forEach(g => { roomSet.add(g.room || g.name); });
    return Array.from(roomSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
  }, [filteredGroups]);

  const grid = useMemo(() => {
    const map: Record<string, Record<string, Group>> = {};
    rows.forEach(room => { map[room] = {}; });
    filteredGroups.forEach(g => {
      const rowKey = g.room || g.name;
      if (map[rowKey] && g.time) map[rowKey][g.time] = g;
    });
    return map;
  }, [filteredGroups, rows]);

  const getMonthLabel = (group: Group) => {
    if (!group.startDate) return '';
    const d = new Date(group.startDate);
    const months = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
    return `${months[d.getMonth()]}${String(d.getFullYear()).slice(2)}`;
  };

  const getCellStyle = (group: Group) => {
    if (!group.startDate) return 'border-emerald-300 bg-emerald-50/50';
    const diffDays = Math.floor((Date.now() - new Date(group.startDate).getTime()) / 86400000);
    if (diffDays < 30) return 'border-red-300 bg-red-50/50';
    return 'border-emerald-300 bg-emerald-50/50';
  };

  const getCountColor = (group: Group) => {
    if (!group.startDate) return 'text-emerald-600 bg-emerald-100';
    const diffDays = Math.floor((Date.now() - new Date(group.startDate).getTime()) / 86400000);
    if (diffDays < 30) return 'text-red-600 bg-red-100';
    return 'text-emerald-600 bg-emerald-100';
  };

  return (
    <DashboardLayout navItems={adminNav} roleLabel="Admin" roleColor="bg-red-100 text-red-700">
      <div className="h-full flex flex-col overflow-hidden">
        {/* Day type radio + mode select */}
        <div className="flex items-center justify-between flex-shrink-0 mb-3">
          <div className="flex items-center gap-6">
            {DAY_TYPES.map(dt => (
              <label key={dt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dayType"
                  checked={activeDayType === dt.value}
                  onChange={() => setActiveDayType(dt.value)}
                  className="w-4 h-4 accent-red-500"
                />
                <span className={`text-sm font-medium ${activeDayType === dt.value ? 'text-red-500' : 'text-slate-600'}`}>
                  {dt.label}
                </span>
              </label>
            ))}
          </div>
          <select
            value={activeMode}
            onChange={e => setActiveMode(e.target.value as 'offline' | 'online')}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="offline">Offline</option>
            <option value="online">Online</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          </div>
        ) : allTimeSlots.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
            <p className="text-slate-400 text-sm">Bu rejim uchun jadval topilmadi.</p>
            <p className="text-slate-300 text-xs mt-1">Guruhlar sahifasidan xona va vaqt belgilang.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 rounded-xl border border-slate-200 bg-white overflow-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: allTimeSlots.length * 110 + 80 }}>
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="border border-slate-200 bg-slate-100 py-2 px-2 text-[11px] font-bold text-slate-500 w-16 text-center sticky left-0 z-20">
                    Xonalar
                  </th>
                  {allTimeSlots.map(time => (
                    <th key={time} className="border border-slate-200 bg-slate-100 py-2 px-1 text-[11px] font-bold text-cyan-600 text-center" style={{ minWidth: 100 }}>
                      {time}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(room => (
                  <tr key={room}>
                    <td className="border border-slate-200 bg-slate-50 py-1 px-2 align-middle text-center sticky left-0 z-[5]" style={{ height: 90 }}>
                      <div className="text-[9px] text-slate-400 uppercase leading-tight">
                        {room.replace(/\d+/g, '')}
                      </div>
                      <div className="text-base font-bold text-slate-800">
                        {room.match(/\d+/)?.[0] || room}
                      </div>
                    </td>
                    {allTimeSlots.map(time => {
                      const group = grid[room]?.[time];
                      return (
                        <td key={time} className="border border-slate-200 p-1 align-top" style={{ height: 90 }}>
                          {group ? (
                            <div
                              onClick={() => router.push(`/dashboard/admin/groups/${group.id}`)}
                              className={`rounded border p-1.5 h-full flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow ${getCellStyle(group)}`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-0.5">
                                  <span className="text-[11px] font-bold text-slate-800 leading-tight truncate">{group.name}</span>
                                  <span className="text-[8px] text-slate-400 whitespace-nowrap">{getMonthLabel(group)}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                  {group.teacher?.name || '—'}
                                </div>
                              </div>
                              <div className="flex items-center justify-end">
                                <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${getCountColor(group)}`}>
                                  {group._count?.students ?? 0}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
