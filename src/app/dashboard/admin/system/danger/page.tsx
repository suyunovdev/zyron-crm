import { Skull } from 'lucide-react';
import { DangerTab } from '@/components/system-tabs';

export default function Page() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-xl font-bold text-red-600 flex items-center gap-2 mb-5">
        <Skull className="w-6 h-6" /> Xavfli zona
      </h1>
      <DangerTab />
    </div>
  );
}
