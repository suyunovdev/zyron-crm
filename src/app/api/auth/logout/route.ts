import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const cookieDomain = host.includes('akaukalarmarkazi.uz') ? '.akaukalarmarkazi.uz' : undefined;

  const response = NextResponse.json({ ok: true });
  response.cookies.set('token', '', {
    maxAge: 0,
    path: '/',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  return response;
}
