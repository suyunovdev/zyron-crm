import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const path = req.nextUrl.pathname;

  // Dashboard sahifalariga kirish uchun token kerak
  if (path.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const user = await verifyToken(token);
    if (!user) {
      const response = NextResponse.redirect(new URL('/login', req.url));
      response.cookies.set('token', '', { maxAge: 0, path: '/' });
      return response;
    }

    // Role-based access control
    if (path.startsWith('/dashboard/admin') && user.role !== 'admin') {
      return NextResponse.redirect(new URL(`/dashboard/${user.role}`, req.url));
    }
    if (path.startsWith('/dashboard/teacher') && user.role !== 'teacher') {
      return NextResponse.redirect(new URL(`/dashboard/${user.role}`, req.url));
    }
    if (path.startsWith('/dashboard/student') && user.role !== 'student') {
      return NextResponse.redirect(new URL(`/dashboard/${user.role}`, req.url));
    }
  }

  // Login sahifasiga kirgan foydalanuvchi allaqachon tizimda bo'lsa
  if (path === '/login' && token) {
    const user = await verifyToken(token);
    if (user) {
      return NextResponse.redirect(new URL(`/dashboard/${user.role}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
