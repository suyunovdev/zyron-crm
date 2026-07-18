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
    role: user.role as 'admin' | 'teacher' | 'student',
  });

  const response = NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
    redirect: user.role === 'admin' ? '/dashboard/admin' :
              user.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student',
  });

  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return response;
}
