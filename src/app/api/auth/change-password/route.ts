import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Joriy va yangi parol kerak' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
  }

  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return NextResponse.json({ error: 'Joriy parol noto\'g\'ri' }, { status: 400 });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  await prisma.user.update({
    where: { id: session.id },
    data: { password: hashedPassword },
  });

  return NextResponse.json({ ok: true });
}
