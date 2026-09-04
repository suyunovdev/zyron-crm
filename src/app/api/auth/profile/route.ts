import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createToken, type SessionUser } from '@/lib/auth';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';

// O'z profilini tahrirlash (ism, telefon) — faqat admin/superadmin.
// Login va rol o'zgartirilmaydi. Ism o'zgargani header/menyuda darrov ko'rinishi uchun
// JWT cookie qayta beriladi (tokenVersion o'zgarmaydi — bu xavfsizlik hodisasi emas).
const Schema = z.object({
  name: z.string().trim().min(1, 'Ism kerak').max(120),
  phone: z.string().trim().max(32).optional().nullable(),
});

const ALLOWED = ['admin', 'superadmin'];

export async function PATCH(req: NextRequest) {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;
  if (!ALLOWED.includes(session.role)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  const parsed = await parseBody(req, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { name, phone } = parsed;

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: { name, phone: phone || null },
    select: { name: true, phone: true, login: true, role: true, tokenVersion: true },
  });

  const fresh: SessionUser = {
    id: session.id,
    login: updated.login,
    name: updated.name,
    role: updated.role as SessionUser['role'],
    ...(session.impersonatedBy ? { impersonatedBy: session.impersonatedBy } : {}),
  };
  const token = await createToken(fresh, { tokenVersion: updated.tokenVersion });

  const host = req.headers.get('host') || '';
  const cookieDomain = host.includes('akaukalarmarkazi.uz') ? '.akaukalarmarkazi.uz' : undefined;

  const response = NextResponse.json({ ok: true, name: updated.name, phone: updated.phone });
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
