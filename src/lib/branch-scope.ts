import { prisma } from './db';
import type { SessionUser } from './auth';

/**
 * Admin qaysi filialga cheklangan?
 *
 *  - `null` qaytsa: cheklov yo'q — superadmin yoki filialga biriktirilmagan
 *    "bosh admin" barcha filiallarni ko'radi/boshqaradi.
 *  - `string` (branchId) qaytsa: admin faqat shu filial ma'lumotini ko'radi.
 *
 * Filial har doim DB'dan o'qiladi (JWT token'ga ishonilmaydi) — bu xavfsizlik
 * chegarasi, shuning uchun manba autoritativ bo'lishi shart.
 */
export async function scopedBranchId(auth: SessionUser): Promise<string | null> {
  if (auth.role === 'superadmin') return null;
  const u = await prisma.user.findUnique({ where: { id: auth.id }, select: { branchId: true } });
  return u?.branchId ?? null;
}

/** User (o'quvchi/ustoz/ota-ona) so'roviga filial filtri (bo'sh bo'lsa cheklov yo'q). */
export function userBranchWhere(branchId: string | null): { branchId?: string } {
  return branchId ? { branchId } : {};
}

/** student relatsiyasi orqali filial filtri (Payment, Note kabi modellar uchun). */
export function studentBranchWhere(branchId: string | null): { student?: { branchId: string } } {
  return branchId ? { student: { branchId } } : {};
}
