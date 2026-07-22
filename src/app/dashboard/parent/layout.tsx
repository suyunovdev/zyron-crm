'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { parentNav } from '@/lib/nav';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={parentNav} roleLabel="Ota-ona" roleColor="bg-amber-100 text-amber-700">
      {children}
    </DashboardLayout>
  );
}
