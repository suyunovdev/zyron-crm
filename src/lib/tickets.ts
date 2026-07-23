import type { SessionUser } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';

export const TICKET_CATEGORIES = [
  'attendance', 'schedule', 'salary', 'student', 'technical', 'leave', 'other',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  attendance: 'Davomat',
  schedule: 'Jadval/xona',
  salary: 'Maosh',
  student: "O'quvchi",
  technical: 'Texnik',
  leave: "Ta'til",
  other: 'Boshqa',
};

export const STATUS_LABELS: Record<string, string> = {
  open: 'Ochiq',
  in_progress: 'Jarayonda',
  resolved: 'Hal qilindi',
  closed: 'Yopildi',
};

export interface TicketLike {
  authorId: string;
  recipientType: string;
  recipientId: string | null;
}

/** Foydalanuvchi ticketni ko'ra/javob bera oladimi? */
export function canAccessTicket(user: SessionUser, t: TicketLike): boolean {
  return ticketRole(user, t) !== null;
}

/** Ticketda foydalanuvchi kim: muallif (ustoz) yoki qabul qiluvchi (admin/ota-ona). */
export function ticketRole(user: SessionUser, t: TicketLike): 'author' | 'recipient' | null {
  if (t.authorId === user.id) return 'author';
  if (t.recipientType === 'admin' && isAdminRole(user.role)) return 'recipient';
  if (t.recipientType === 'parent' && t.recipientId === user.id) return 'recipient';
  return null;
}
