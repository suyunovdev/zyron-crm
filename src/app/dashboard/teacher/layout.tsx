'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { teacherNav } from '@/lib/nav';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={teacherNav} roleLabel="O'qituvchi" roleColor="bg-emerald-100 text-emerald-700">
      {children}
    </DashboardLayout>
  );
}
