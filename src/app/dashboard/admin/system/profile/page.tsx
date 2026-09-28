import { Building } from 'lucide-react';
import { CenterProfileTab } from '@/components/center-profile-tab';

export default function Page() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-5">
        <Building className="w-6 h-6 text-slate-600" /> Markaz profili
      </h1>
      <CenterProfileTab />
    </div>
  );
}
