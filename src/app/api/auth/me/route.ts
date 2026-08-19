import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
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
