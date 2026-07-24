import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { parseBody } from '@/lib/validate';

const Schema = z.object({
  currentPassword: z.string().min(1, 'joriy parol kerak').max(128),
  newPassword: z.string().min(4, 'kamida 4 belgi').max(128),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await parseBody(req, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { currentPassword, newPassword } = parsed;

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
