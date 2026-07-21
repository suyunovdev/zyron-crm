import { Users, UsersRound, UserPlus, FolderOpen, ClipboardList, CreditCard, UserSearch, FileBarChart, LayoutDashboard, CalendarClock, Settings } from 'lucide-react';
import type { NavItem } from '@/components/DashboardLayout';

export const adminNav: NavItem[] = [
  { label: 'Asosiy', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'Yangi lid', href: '/dashboard/admin/leads', icon: UserSearch },
  { label: "O'quvchilar", href: '/dashboard/admin/students', icon: Users },
  { label: "O'qituvchilar", href: '/dashboard/admin/teachers', icon: UserPlus },
  { label: 'Guruhlar', href: '/dashboard/admin/groups', icon: FolderOpen },
  { label: "To'lovlar", href: '/dashboard/admin/payments', icon: CreditCard },
  { label: 'Jadval', href: '/dashboard/admin/schedule', icon: CalendarClock },
  { label: 'Oylik hisobot', href: '/dashboard/admin/reports', icon: FileBarChart, action: 'report-modal' },
];

export const teacherNav: NavItem[] = [
  { label: 'Asosiy', href: '/dashboard/teacher', icon: LayoutDashboard },
  { label: 'Guruhlar', href: '/dashboard/teacher/groups', icon: FolderOpen },
];

export const studentNav: NavItem[] = [
  { label: 'Guruhlarim', href: '/dashboard/student/groups', icon: UsersRound },
  { label: 'Davomatim', href: '/dashboard/student/attendance', icon: ClipboardList },
];
