import { DatabaseBackup } from 'lucide-react';
import { BackupTab } from '@/components/system-tabs';

export default function Page() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-5">
        <DatabaseBackup className="w-6 h-6 text-slate-600" /> Zaxira
      </h1>
      <BackupTab />
    </div>
  );
}
