import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { canManageRole } from '@/lib/roles';

export async function POST(req: NextRequest) {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const { userId, newPassword } = await req.json();
  if (!userId || !newPassword) {
    return NextResponse.json({ error: 'userId va newPassword kerak' }, { status: 400 });
  }

  if (newPassword.length < 4) {
    return NextResponse.json({ error: 'Parol kamida 4 ta belgi bo\'lishi kerak' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
  }

  // Admin/superadmin parolini faqat superadmin tiklay oladi (akkaunt egallab olishning oldini oladi)
  if (!canManageRole(auth.role, user.role)) {
    return NextResponse.json({ error: 'Bu foydalanuvchi parolini tiklashga ruxsatingiz yo\'q' }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { password: bcrypt.hashSync(newPassword, 10), rawPass: newPassword },
  });

  return NextResponse.json({ ok: true });
}
