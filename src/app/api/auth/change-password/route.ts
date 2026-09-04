import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createToken, type SessionUser } from '@/lib/auth';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const Schema = z.object({
  currentPassword: z.string().min(1, 'joriy parol kerak').max(128),
  newPassword: z.string().min(6, 'kamida 6 belgi').max(128),
});

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  // Parol taxminlashga qarshi: foydalanuvchi bo'yicha 1 daqiqada 5 urinish
  const rl = rateLimit(`chpw:${session.id}:${getClientIp(req)}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Juda ko'p urinish. ${rl.retryAfterSec} soniyadan keyin qayta urinib ko'ring` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
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

  // Parol o'zgarganda tokenVersion oshiriladi → barcha eski sessiyalar bekor bo'ladi
  // (parol o'g'irlangan bo'lsa, boshqa qurilmalar chiqib ketadi).
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  const updated = await prisma.user.update({
    where: { id: session.id },
    data: { password: hashedPassword, tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });

  // Joriy foydalanuvchi chiqib ketmasin — yangi tokenVersion bilan cookie'ni yangilaymiz.
  const fresh: SessionUser = {
    id: user.id,
    login: user.login,
    name: user.name,
    role: user.role as SessionUser['role'],
    ...(session.impersonatedBy ? { impersonatedBy: session.impersonatedBy } : {}),
  };
  const token = await createToken(fresh, { tokenVersion: updated.tokenVersion });

  const host = req.headers.get('host') || '';
  const cookieDomain = host.includes('akaukalarmarkazi.uz') ? '.akaukalarmarkazi.uz' : undefined;

  const response = NextResponse.json({ ok: true });
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  return response;
}
