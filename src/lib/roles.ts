/**
 * Rol ierarxiyasi va boshqaruv qoidalari (yagona manba).
 *
 *   superadmin  — tizim egasi: adminlarni boshqaradi, hammaga ruxsat, himoyalangan
 *   admin       — o'qituvchi/o'quvchi/ota-onalarni boshqaradi (adminlarni EMAS)
 *   teacher / student / parent — o'z sohalari
 */

export type Role = 'superadmin' | 'admin' | 'teacher' | 'student' | 'parent';

/** admin darajasidagi rollar (superadmin + admin). */
export function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'superadmin';
}

/**
 * actorRole egasi targetRole'li foydalanuvchini yarata/tahrirlay/o'chira oladimi?
 *  - superadmin: hammani (admin va superadmin ham)
 *  - admin: faqat admin bo'lmaganlarni (teacher/student/parent)
 *  - qolganlar: hech kimni
 */
export function canManageRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === 'superadmin') return true;
  if (actorRole === 'admin') return !isAdminRole(targetRole);
  return false;
}

/** Superadmin panelida yaratish/tahrirlash mumkin bo'lgan rollar. */
export const MANAGEABLE_STAFF_ROLES: Role[] = ['admin', 'superadmin'];
