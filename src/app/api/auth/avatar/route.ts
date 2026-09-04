import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// Foydalanuvchi o'z profil rasmini yuklaydi/o'chiradi (base64 data URL, DB'da saqlanadi).
// Rasm client tomonda ~256px ga siqiladi, shuning uchun kichik bo'ladi.
const MAX_LEN = 500_000; // ~375KB — mustahkam chegara

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;

    const { avatar } = await req.json();

    if (avatar === null) {
      await prisma.user.update({ where: { id: session.id }, data: { avatar: null } });
      return NextResponse.json({ avatar: null });
    }

    if (typeof avatar !== 'string' || !avatar.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Rasm formati noto\'g\'ri' }, { status: 400 });
    }
    if (avatar.length > MAX_LEN) {
      return NextResponse.json({ error: 'Rasm juda katta' }, { status: 413 });
    }

    await prisma.user.update({ where: { id: session.id }, data: { avatar } });
    return NextResponse.json({ avatar });
  } catch (error) {
    logger.error('[POST /api/auth/avatar]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
