import { describe, it, expect } from 'vitest';
import { ticketRole, canAccessTicket } from '@/lib/tickets';

const teacher = { id: 'T', login: 't', name: 'T', role: 'teacher' as const };
const admin = { id: 'A', login: 'a', name: 'A', role: 'admin' as const };
const superadmin = { id: 'SA', login: 's', name: 'S', role: 'superadmin' as const };
const parent = { id: 'P', login: 'p', name: 'P', role: 'parent' as const };
const other = { id: 'X', login: 'x', name: 'X', role: 'teacher' as const };

const adminTicket = { authorId: 'T', recipientType: 'admin', recipientId: null };
const parentTicket = { authorId: 'T', recipientType: 'parent', recipientId: 'P' };

describe('ticketRole — kirish nazorati', () => {
  it('muallif (ustoz) → author', () => {
    expect(ticketRole(teacher, adminTicket)).toBe('author');
    expect(ticketRole(teacher, parentTicket)).toBe('author');
  });
  it('admin/superadmin → admin-ticketda recipient', () => {
    expect(ticketRole(admin, adminTicket)).toBe('recipient');
    expect(ticketRole(superadmin, adminTicket)).toBe('recipient');
  });
  it('ota-ona → o\'z parent-ticketida recipient', () => {
    expect(ticketRole(parent, parentTicket)).toBe('recipient');
  });
  it('admin parent-ticketni ko\'ra olmaydi', () => {
    expect(ticketRole(admin, parentTicket)).toBe(null);
    expect(canAccessTicket(admin, parentTicket)).toBe(false);
  });
  it('boshqa ota-ona ko\'ra olmaydi', () => {
    expect(ticketRole({ ...parent, id: 'P2' }, parentTicket)).toBe(null);
  });
  it('begona ustoz ko\'ra olmaydi', () => {
    expect(ticketRole(other, adminTicket)).toBe(null);
    expect(ticketRole(other, parentTicket)).toBe(null);
  });
});
