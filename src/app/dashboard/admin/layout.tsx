'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { adminNav } from '@/lib/nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={adminNav} roleLabel="Admin" roleColor="bg-red-100 text-red-700">
      {children}
    </DashboardLayout>
  );
}
