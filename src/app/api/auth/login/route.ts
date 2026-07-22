import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { login, password } = await req.json();

  if (!login || !password) {
    return NextResponse.json({ error: 'Login va parol kiriting' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { login } });

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return NextResponse.json({ error: 'Login yoki parol noto\'g\'ri' }, { status: 401 });
  }

  if (user.status !== 'active') {
    const msg = user.status === 'frozen' ? 'Hisobingiz muzlatilgan' : 'Hisobingiz arxivlangan';
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const token = await createToken({
    id: user.id,
    login: user.login,
    name: user.name,
    role: user.role as 'superadmin' | 'admin' | 'teacher' | 'student' | 'parent',
  });

  const dashboardPath =
    (user.role === 'admin' || user.role === 'superadmin') ? '/dashboard/admin' :
    user.role === 'teacher' ? '/dashboard/teacher' :
    user.role === 'parent' ? '/dashboard/parent' : '/dashboard/student';

  // Subdomen bo'yicha to'g'ri URL qaytarish
  const host = req.headers.get('host') || '';
  const isStaff = ['superadmin', 'admin', 'teacher'].includes(user.role);
  const isClient = ['student', 'parent'].includes(user.role);
  let redirectUrl = dashboardPath;

  // Agar noto'g'ri subdomenda bo'lsa, to'g'ri subdomendagi URL qaytarish
  if (host.startsWith('my.') && isStaff) {
    const staffHost = host.replace(/^my\./, 'crm.');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    redirectUrl = `${proto}://${staffHost}${dashboardPath}`;
  } else if (host.startsWith('crm.') && isClient) {
    const clientHost = host.replace(/^crm\./, 'my.');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    redirectUrl = `${proto}://${clientHost}${dashboardPath}`;
  }

  const response = NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
    redirect: redirectUrl,
  });

  // Cookie'ni ikkala subdomenda ham o'qish uchun domain sozlash
  const cookieDomain = host.includes('akaukalarmarkazi.uz') ? '.akaukalarmarkazi.uz' : undefined;

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
