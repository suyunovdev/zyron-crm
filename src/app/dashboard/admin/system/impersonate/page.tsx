import { UserCog } from 'lucide-react';
import { ImpersonateTab } from '@/components/system-tabs';

export default function Page() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-5">
        <UserCog className="w-6 h-6 text-slate-600" /> Kirish (impersonatsiya)
      </h1>
      <ImpersonateTab />
    </div>
  );
}
