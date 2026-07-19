'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { studentNav } from '@/lib/nav';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={studentNav} roleLabel="O'quvchi" roleColor="bg-blue-100 text-blue-700">
      {children}
    </DashboardLayout>
  );
}
