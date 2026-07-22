import { describe, it, expect } from 'vitest';
import { isAdminRole, canManageRole } from '@/lib/roles';

describe('isAdminRole', () => {
  it('admin va superadmin → true', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('superadmin')).toBe(true);
  });
  it('boshqalar → false', () => {
    for (const r of ['teacher', 'student', 'parent', '']) expect(isAdminRole(r)).toBe(false);
  });
});

describe('canManageRole', () => {
  it('superadmin hammani boshqaradi', () => {
    for (const t of ['superadmin', 'admin', 'teacher', 'student', 'parent'])
      expect(canManageRole('superadmin', t)).toBe(true);
  });

  it('admin faqat admin bo\'lmaganlarni boshqaradi', () => {
    expect(canManageRole('admin', 'teacher')).toBe(true);
    expect(canManageRole('admin', 'student')).toBe(true);
    expect(canManageRole('admin', 'parent')).toBe(true);
    // admin boshqa adminni yoki superadminni boshqara OLMAYDI (privilege escalation himoyasi)
    expect(canManageRole('admin', 'admin')).toBe(false);
    expect(canManageRole('admin', 'superadmin')).toBe(false);
  });

  it('teacher/student hech kimni boshqara olmaydi', () => {
    expect(canManageRole('teacher', 'student')).toBe(false);
    expect(canManageRole('student', 'student')).toBe(false);
  });
});
