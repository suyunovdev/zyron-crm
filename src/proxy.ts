import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Xodimlar (staff) rollari — crm.* subdomenida ishlaydi
const STAFF_ROLES = ['superadmin', 'admin', 'teacher'];
// Mijozlar (client) rollari — my.* subdomenida ishlaydi
const CLIENT_ROLES = ['student', 'parent'];

function isStaffHost(host: string): boolean {
  return host.startsWith('crm.') || host.startsWith('localhost');
}

function isClientHost(host: string): boolean {
  return host.startsWith('my.');
}

function getStaffUrl(req: NextRequest, path: string): URL {
  const host = req.headers.get('host') || '';
  // my.akaukalarmarkazi.uz → crm.akaukalarmarkazi.uz
  const staffHost = host.replace(/^my\./, 'crm.');
  const url = new URL(path, req.url);
  url.host = staffHost;
  return url;
}

function getClientUrl(req: NextRequest, path: string): URL {
  const host = req.headers.get('host') || '';
  // crm.akaukalarmarkazi.uz → my.akaukalarmarkazi.uz
  const clientHost = host.replace(/^crm\./, 'my.');
  const url = new URL(path, req.url);
  url.host = clientHost;
  return url;
}

function getDashboardPath(role: string): string {
  switch (role) {
    case 'superadmin':
    case 'admin': return '/dashboard/admin';
    case 'teacher': return '/dashboard/teacher';
    case 'parent': return '/dashboard/parent';
    case 'student': return '/dashboard/student';
    default: return '/login';
  }
}

export async function proxy(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const path = req.nextUrl.pathname;
  const host = req.headers.get('host') || '';

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

    const role = user.role;
    const dashboardPath = getDashboardPath(role);

    // Subdomen bo'yicha cheklash
    // Staff user my.* ga kirsa → crm.* ga yo'naltirish
    if (isClientHost(host) && STAFF_ROLES.includes(role)) {
      return NextResponse.redirect(getStaffUrl(req, dashboardPath));
    }
    // Client user crm.* ga kirsa → my.* ga yo'naltirish
    if (isStaffHost(host) && CLIENT_ROLES.includes(role) && !host.startsWith('localhost')) {
      return NextResponse.redirect(getClientUrl(req, dashboardPath));
    }

    // Role-based access control
    if (path.startsWith('/dashboard/admin') && role !== 'admin' && role !== 'superadmin') {
      return NextResponse.redirect(new URL(dashboardPath, req.url));
    }
    if (path.startsWith('/dashboard/teacher') && role !== 'teacher') {
      return NextResponse.redirect(new URL(dashboardPath, req.url));
    }
    if (path.startsWith('/dashboard/student') && role !== 'student') {
      return NextResponse.redirect(new URL(dashboardPath, req.url));
    }
    if (path.startsWith('/dashboard/parent') && role !== 'parent') {
      return NextResponse.redirect(new URL(dashboardPath, req.url));
    }
  }

  // Login sahifasiga kirgan foydalanuvchi allaqachon tizimda bo'lsa
  if (path === '/login' && token) {
    const user = await verifyToken(token);
    if (user) {
      const role = user.role;
      const dashboardPath = getDashboardPath(role);

      // Subdomen bo'yicha to'g'ri joyga yo'naltirish
      if (isClientHost(host) && STAFF_ROLES.includes(role)) {
        return NextResponse.redirect(getStaffUrl(req, dashboardPath));
      }
      if (isStaffHost(host) && CLIENT_ROLES.includes(role) && !host.startsWith('localhost')) {
        return NextResponse.redirect(getClientUrl(req, dashboardPath));
      }

      return NextResponse.redirect(new URL(dashboardPath, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
