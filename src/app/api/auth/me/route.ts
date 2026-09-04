import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-utils';
import { prisma } from '@/lib/db';

export async function GET() {
  // requireAuth (getSession EMAS): bekor qilingan/muzlatilgan sessiya (tokenVersion/status) o'tmasin.
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;
  // Avatar/telefon JWT'да yo'q — DB'dan qo'shamiz (profil rasm ko'rsatish uchun)
  const u = await prisma.user.findUnique({
    where: { id: session.id },
    select: { avatar: true, phone: true, telegramChatId: true },
  });
  return NextResponse.json({
    user: {
      ...session,
      avatar: u?.avatar ?? null,
      phone: u?.phone ?? null,
      telegramLinked: Boolean(u?.telegramChatId),
    },
  });
}
