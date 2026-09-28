import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { createToken, type SessionUser } from '@/lib/auth';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

// Superadmin o'z loginini o'zgartiradi ("Markaz profili" tabi).
// Parol uchun mavjud /api/auth/change-password ishlatiladi.
const Schema = z.object({
  currentPassword: z.string().min(1, 'joriy parol kerak').max(128),
  newLogin: z.string().trim().min(3, 'kamida 3 belgi').max(40)
    .regex(/^[A-Za-z0-9._-]+$/, 'faqat lotin harf, raqam, . _ -'),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth('superadmin');
    if (session instanceof NextResponse) return session;
    if (session.impersonatedBy) {
      return NextResponse.json({ error: 'Kirish rejimida login o\'zgartirib bo\'lmaydi' }, { status: 403 });
    }

    const rl = rateLimit(`chlogin:${session.id}:${getClientIp(req)}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Juda ko'p urinish. ${rl.retryAfterSec} soniyadan keyin qayta urinib ko'ring` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    const parsed = await parseBody(req, Schema);
    if (parsed instanceof NextResponse) return parsed;
    const { currentPassword, newLogin } = parsed;

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return NextResponse.json({ error: 'Joriy parol noto\'g\'ri' }, { status: 400 });
    }
    if (newLogin === user.login) {
      return NextResponse.json({ error: 'Yangi login joriy login bilan bir xil' }, { status: 400 });
    }

    let updated;
    try {
      // Login o'zgarganda tokenVersion oshadi → boshqa qurilmalardagi sessiyalar bekor bo'ladi
      updated = await prisma.user.update({
        where: { id: user.id },
        data: { login: newLogin, tokenVersion: { increment: 1 } },
        select: { login: true, tokenVersion: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json({ error: 'Bu login band' }, { status: 409 });
      }
      throw e;
    }

    await logAudit(session, 'update', 'user', user.id, `Superadmin login: ${user.login} → ${updated.login}`);

    // Joriy foydalanuvchi chiqib ketmasin — yangi login/tokenVersion bilan cookie'ni yangilaymiz.
    const fresh: SessionUser = {
      id: user.id,
      login: updated.login,
      name: user.name,
      role: user.role as SessionUser['role'],
    };
    const token = await createToken(fresh, { tokenVersion: updated.tokenVersion });

    const host = req.headers.get('host') || '';
    const cookieDomain = host.includes('akaukalarmarkazi.uz') ? '.akaukalarmarkazi.uz' : undefined;

    const response = NextResponse.json({ ok: true, login: updated.login });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
    return response;
  } catch (error) {
    logger.error('[PATCH /api/superadmin/account]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
