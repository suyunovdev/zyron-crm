'use client';

import { useState } from 'react';
import { SlidersHorizontal, BarChart3, Building2, Send, UserCog, DatabaseBackup, ShieldAlert, Skull } from 'lucide-react';
import { SettingsTab, AnalyticsTab, BranchesTab, BroadcastTab, ImpersonateTab, BackupTab, SecurityTab, DangerTab } from '@/components/system-tabs';

type Tab = 'settings' | 'analytics' | 'branches' | 'broadcast' | 'impersonate' | 'backup' | 'security' | 'danger';
const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'settings', label: 'Sozlamalar', icon: SlidersHorizontal },
  { id: 'analytics', label: 'Analitika', icon: BarChart3 },
  { id: 'branches', label: 'Filiallar', icon: Building2 },
  { id: 'broadcast', label: 'Tarqatma', icon: Send },
  { id: 'impersonate', label: 'Kirish', icon: UserCog },
  { id: 'backup', label: 'Zaxira', icon: DatabaseBackup },
  { id: 'security', label: 'Xavfsizlik', icon: ShieldAlert },
  { id: 'danger', label: 'Xavfli zona', icon: Skull },
];

export default function SystemPage() {
  const [tab, setTab] = useState<Tab>('settings');
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
        <SlidersHorizontal className="w-6 h-6 text-slate-600" /> Tizim boshqaruvi
      </h1>
      <div className="flex flex-wrap gap-1.5 mb-6 border-b border-slate-200 pb-3">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-[#2660A4] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'settings' && <SettingsTab />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'branches' && <BranchesTab />}
      {tab === 'broadcast' && <BroadcastTab />}
      {tab === 'impersonate' && <ImpersonateTab />}
      {tab === 'backup' && <BackupTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'danger' && <DangerTab />}
    </div>
  );
}
