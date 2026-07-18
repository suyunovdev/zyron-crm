import { Users, UsersRound, UserPlus, FolderOpen, ClipboardList, CreditCard, UserSearch, FileBarChart, LayoutDashboard, CalendarClock } from 'lucide-react';
import type { NavItem } from '@/components/DashboardLayout';

export const adminNav: NavItem[] = [
  { label: 'Asosiy', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'Yangi lid', href: '/dashboard/admin/leads', icon: UserSearch },
  { label: "O'quvchilar", href: '/dashboard/admin/students', icon: Users },
  { label: "O'qituvchilar", href: '/dashboard/admin/teachers', icon: UserPlus },
  { label: 'Guruhlar', href: '/dashboard/admin/groups', icon: FolderOpen },
  { label: "To'lovlar", href: '/dashboard/admin/payments', icon: CreditCard },
  { label: 'Jadval', href: '/dashboard/admin/schedule', icon: CalendarClock },
  { label: 'Oylik hisobot', href: '/dashboard/admin/reports', icon: FileBarChart },
];

export const teacherNav: NavItem[] = [];

export const studentNav: NavItem[] = [
  { label: 'Guruhlarim', href: '/dashboard/student/groups', icon: UsersRound },
  { label: 'Davomatim', href: '/dashboard/student/attendance', icon: ClipboardList },
];
