import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { createToken, getDashboardPath } from '@/lib/auth';
import { parseBody } from '@/lib/validate';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

const cookieOpts = (host: string) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 4, // impersonation — 4 soat
  path: '/',
  ...(host.includes('akaukalarmarkazi.uz') ? { domain: '.akaukalarmarkazi.uz' } : {}),
});

const Schema = z.object({ targetUserId: z.string().min(1) });

// Boshqa foydalanuvchi sifatida kirish (superadmin support/debug uchun)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const parsed = await parseBody(req, Schema);
    if (parsed instanceof NextResponse) return parsed;

    const target = await prisma.user.findUnique({ where: { id: parsed.targetUserId } });
    if (!target) return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    if (target.id === auth.id) return NextResponse.json({ error: 'O\'zingizga kirib bo\'lmaydi' }, { status: 400 });

    const token = await createToken({
      id: target.id, login: target.login, name: target.name,
      role: target.role as 'superadmin' | 'admin' | 'teacher' | 'student' | 'parent',
      impersonatedBy: { id: auth.id, name: auth.name },
    });

    await logAudit(auth, 'login-as', 'user', target.id, `${target.name} (${target.role}) sifatida kirdi`);

    const res = NextResponse.json({ ok: true, redirect: getDashboardPath(target.role) });
    res.cookies.set('token', token, cookieOpts(req.headers.get('host') || ''));
    return res;
  } catch (error) {
    logger.error('[POST /api/superadmin/impersonate]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// Impersonationni tugatish — asl superadminga qaytish
export async function DELETE(req: NextRequest) {
  try {
    const { getSession } = await import('@/lib/auth');
    const session = await getSession();
    if (!session?.impersonatedBy) {
      return NextResponse.json({ error: 'Impersonation faol emas' }, { status: 400 });
    }
    const orig = await prisma.user.findUnique({ where: { id: session.impersonatedBy.id } });
    if (!orig) return NextResponse.json({ error: 'Asl foydalanuvchi topilmadi' }, { status: 404 });

    const token = await createToken({
      id: orig.id, login: orig.login, name: orig.name,
      role: orig.role as 'superadmin' | 'admin' | 'teacher' | 'student' | 'parent',
    });
    const res = NextResponse.json({ ok: true, redirect: getDashboardPath(orig.role) });
    res.cookies.set('token', token, cookieOpts(req.headers.get('host') || ''));
    return res;
  } catch (error) {
    logger.error('[DELETE /api/superadmin/impersonate]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
