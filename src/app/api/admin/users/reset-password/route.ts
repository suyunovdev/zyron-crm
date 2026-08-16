import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { canManageRole } from '@/lib/roles';
import { scopedBranchId } from '@/lib/branch-scope';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  // Ommaviy parol tiklashni cheklash: admin bo'yicha 1 daqiqada 20 urinish
  const rl = rateLimit(`resetpw:${auth.id}:${getClientIp(req)}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Juda ko'p urinish. ${rl.retryAfterSec} soniyadan keyin qayta urinib ko'ring` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  const { userId, newPassword } = await req.json();
  if (!userId || !newPassword) {
    return NextResponse.json({ error: 'userId va newPassword kerak' }, { status: 400 });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return NextResponse.json({ error: 'Parol kamida 6 ta belgi bo\'lishi kerak' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
  }

  // Admin/superadmin parolini faqat superadmin tiklay oladi (akkaunt egallab olishning oldini oladi)
  if (!canManageRole(auth.role, user.role)) {
    return NextResponse.json({ error: 'Bu foydalanuvchi parolini tiklashga ruxsatingiz yo\'q' }, { status: 403 });
  }

  // Filial cheklovi: boshqa filial foydalanuvchisi parolini tiklab bo'lmaydi
  const bId = await scopedBranchId(auth);
  if (bId && user.branchId !== bId) {
    return NextResponse.json({ error: 'Bu foydalanuvchi boshqa filialga tegishli' }, { status: 403 });
  }

  // tokenVersion oshiriladi → foydalanuvchining barcha eski sessiyalari bekor
  // bo'ladi (parol tiklangач eski qurilmalarда kirib turolmaydi).
  await prisma.user.update({
    where: { id: userId },
    data: { password: bcrypt.hashSync(newPassword, 10), rawPass: newPassword, tokenVersion: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
