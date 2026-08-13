'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building2, Users, GraduationCap, FolderOpen, ShieldCheck,
  Phone, MapPin, UserCheck, CalendarDays, Wallet, TrendingUp,
} from 'lucide-react';
import { SkeletonDetailPage } from '@/components/skeleton';

interface Detail {
  branch: { id: string; name: string; address: string | null; phone: string | null; createdAt: string };
  kpi: {
    activeStudents: number; totalStudents: number; frozenStudents: number; archivedStudents: number;
    groups: number; activeGroups: number; teachers: number; admins: number;
    monthRevenue: number; totalDebt: number; debtors: number;
    collectionRate: number; attendancePercent: number; leadsTotal: number;
  };
  groups: { id: string; name: string; subject: string; status: string; time: string | null; dayType: string; room: string | null; teacher: { id: string; name: string } | null; _count: { students: number } }[];
  teachers: { id: string; name: string; subject: string | null; level: string | null; phone: string | null; _count: { teacherGroups: number } }[];
  admins: { id: string; name: string; login: string; phone: string | null }[];
  students: { id: string; name: string; phone: string | null; status: string }[];
  leads: { id: string; name: string; phone: string; status: string; source: string | null; createdAt: string }[];
  payments: { id: string; amount: number; month: string; method: string; type: string; createdAt: string; student: { name: string } }[];
}

const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const DAY_LABELS: Record<string, string> = { toq: 'Toq', juft: 'Juft', boshqa: 'Boshqa' };
const LEAD_LABEL: Record<string, string> = { new: 'Yangi', contacted: 'Qo\'ng\'iroq', trial: 'Keyinroq', enrolled: 'Yozildi', rejected: 'Rad etdi' };
const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700', frozen: 'bg-blue-100 text-blue-700', archived: 'bg-slate-100 text-slate-500',
};

type Tab = 'guruhlar' | 'oqituvchilar' | 'oquvchilar' | 'adminlar' | 'lidlar' | 'tolovlar';

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;
  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('guruhlar');

  const load = useCallback(() => {
    fetch(`/api/superadmin/branches/${branchId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setD(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [branchId]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <SkeletonDetailPage />;
  if (!d?.branch) return (
    <div className="text-center py-20 text-slate-400">
      <p>Filial topilmadi</p>
      <button onClick={() => router.push('/dashboard/admin/system/branches')} className="text-blue-600 text-sm mt-2">Orqaga</button>
    </div>
  );

  const k = d.kpi;
  const rateColor = k.collectionRate >= 80 ? 'text-emerald-600' : k.collectionRate >= 50 ? 'text-amber-600' : 'text-red-600';
  const attColor = k.attendancePercent >= 80 ? 'text-emerald-600' : k.attendancePercent >= 50 ? 'text-amber-600' : 'text-red-600';

  const kpis = [
    { label: 'O\'quvchi (faol/jami)', val: `${k.activeStudents}/${k.totalStudents}`, icon: Users, sub: k.frozenStudents ? `${k.frozenStudents} muzlatilgan` : '' },
    { label: 'Guruh (faol/jami)', val: `${k.activeGroups}/${k.groups}`, icon: FolderOpen, sub: '' },
    { label: 'O\'qituvchi', val: k.teachers, icon: GraduationCap, sub: '' },
    { label: 'Admin', val: k.admins, icon: ShieldCheck, sub: '' },
    { label: 'Bu oy tushum', val: `${fmt(k.monthRevenue)}`, icon: Wallet, sub: 'so\'m', accent: 'text-emerald-600' },
    { label: 'Qarzdorlik', val: `${fmt(k.totalDebt)}`, icon: Wallet, sub: `${k.debtors} qarzdor`, accent: k.totalDebt > 0 ? 'text-red-600' : '' },
    { label: 'To\'lov intizomi', val: `${k.collectionRate}%`, icon: TrendingUp, sub: '', accent: rateColor },
    { label: 'Davomat (bu oy)', val: `${k.attendancePercent}%`, icon: UserCheck, sub: '', accent: attColor },
  ];

  const TABS: { key: Tab; label: string; n: number }[] = [
    { key: 'guruhlar', label: 'Guruhlar', n: d.groups.length },
    { key: 'oqituvchilar', label: 'O\'qituvchilar', n: d.teachers.length },
    { key: 'oquvchilar', label: 'O\'quvchilar', n: d.students.length },
    { key: 'adminlar', label: 'Adminlar', n: d.admins.length },
    { key: 'lidlar', label: 'Lidlar', n: k.leadsTotal },
    { key: 'tolovlar', label: 'To\'lovlar', n: d.payments.length },
  ];

  return (
    <>
      <div className="mb-4">
        <Link href="/dashboard/admin/system/branches" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 w-fit">
          <ArrowLeft className="w-4 h-4" /> Filiallar
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2660A4] to-[#22AA79] flex items-center justify-center flex-shrink-0">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{d.branch.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
              {d.branch.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {d.branch.address}</span>}
              {d.branch.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {d.branch.phone}</span>}
              <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {new Date(d.branch.createdAt).getFullYear()}-yildan</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {kpis.map(kp => (
          <div key={kp.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5"><kp.icon className="w-3.5 h-3.5" /> {kp.label}</div>
            <p className={`text-xl font-bold ${kp.accent || 'text-slate-900'}`}>{kp.val}{kp.sub && <span className="text-xs font-normal text-slate-400 ml-1">{kp.sub}</span>}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 px-4 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key ? 'border-[#2660A4] text-[#2660A4]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t.label} <span className="text-xs text-slate-400">{t.n}</span>
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Guruhlar */}
          {tab === 'guruhlar' && (
            <div className="divide-y divide-slate-100">
              {d.groups.length === 0 ? <Empty /> : d.groups.map(g => (
                <Link key={g.id} href={`/dashboard/admin/groups/${g.id}`} className="flex items-center justify-between py-3 hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 truncate">{g.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${g.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{g.status === 'active' ? 'Aktiv' : 'Arxiv'}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{g.subject} · {DAY_LABELS[g.dayType] || g.dayType} {g.time || ''} · {g.teacher?.name || 'mentorsiz'}{g.room ? ` · ${g.room}` : ''}</p>
                  </div>
                  <span className="text-sm text-slate-500 flex items-center gap-1 shrink-0"><Users className="w-3.5 h-3.5" /> {g._count.students}</span>
                </Link>
              ))}
            </div>
          )}

          {/* O'qituvchilar */}
          {tab === 'oqituvchilar' && (
            <div className="divide-y divide-slate-100">
              {d.teachers.length === 0 ? <Empty /> : d.teachers.map(t => (
                <Link key={t.id} href={`/dashboard/admin/teachers/${t.id}`} className="flex items-center justify-between py-3 hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{t.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{[t.level, t.subject, t.phone].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  <span className="text-sm text-slate-500 flex items-center gap-1 shrink-0"><FolderOpen className="w-3.5 h-3.5" /> {t._count.teacherGroups}</span>
                </Link>
              ))}
            </div>
          )}

          {/* O'quvchilar */}
          {tab === 'oquvchilar' && (
            <div className="divide-y divide-slate-100">
              {d.students.length === 0 ? <Empty /> : d.students.map(s => (
                <Link key={s.id} href={`/dashboard/admin/students/${s.id}`} className="flex items-center justify-between py-3 hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                    {s.phone && <p className="text-xs text-slate-400 mt-0.5">{s.phone}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[s.status] || STATUS_BADGE.archived}`}>{s.status === 'active' ? 'Faol' : s.status === 'frozen' ? 'Muzlatilgan' : 'Arxiv'}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Adminlar */}
          {tab === 'adminlar' && (
            <div className="divide-y divide-slate-100">
              {d.admins.length === 0 ? <Empty /> : d.admins.map(a => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{a.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{a.login}{a.phone ? ` · ${a.phone}` : ''}</p>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-[#2660A4] shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Lidlar */}
          {tab === 'lidlar' && (
            <div className="divide-y divide-slate-100">
              {d.leads.length === 0 ? <Empty /> : d.leads.map(l => (
                <div key={l.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{l.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{l.phone}{l.source ? ` · ${l.source}` : ''}</p>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">{LEAD_LABEL[l.status] || l.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* To'lovlar */}
          {tab === 'tolovlar' && (
            <div className="divide-y divide-slate-100">
              {d.payments.length === 0 ? <Empty /> : d.payments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{p.student.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.month} · {p.method === 'card' ? 'Karta' : p.method === 'transfer' ? 'O\'tkazma' : 'Naqd'}{p.type !== 'payment' ? ` · ${p.type === 'refund' ? 'qaytarish' : 'chegirma'}` : ''}</p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${p.amount < 0 ? 'text-red-600' : 'text-slate-700'}`}>{fmt(p.amount)} so&apos;m</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Empty() {
  return <p className="text-sm text-slate-400 text-center py-10">Ma&apos;lumot yo&apos;q</p>;
}
