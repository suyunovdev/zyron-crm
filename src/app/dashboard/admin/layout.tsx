'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminNav, superadminNav } from '@/lib/nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user?.role === 'superadmin') setIsSuperadmin(true); })
      .catch(() => {});
  }, []);

  return (
    <DashboardLayout
      navItems={isSuperadmin ? superadminNav : adminNav}
      roleLabel={isSuperadmin ? 'Superadmin' : 'Admin'}
      roleColor={isSuperadmin ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}
    >
      {children}
    </DashboardLayout>
  );
}
