import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { createTgLinkToken } from '@/lib/tg-token';
import { logger } from '@/lib/logger';

// Ota-ona uchun Telegram bog'lash havolasi (modal shu yerdan token oladi).
// Token on-demand yaratiladi (15 min TTL to'g'ri sanashi uchun).
export async function GET() {
  try {
    const auth = await requireAuth('parent');
    if (auth instanceof NextResponse) return auth;

    const me = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { telegramChatId: true },
    });
    const linked = Boolean(me?.telegramChatId);

    const username = process.env.TELEGRAM_BOT_USERNAME;
    // Allaqachon ulangan yoki bot sozlanmagan bo'lsa — havola shart emas
    if (linked || !username) {
      return NextResponse.json({ linked, deepLink: null });
    }

    const token = await createTgLinkToken(auth.id);
    const deepLink = `https://t.me/${username}?start=${token}`;
    return NextResponse.json({ linked, deepLink });
  } catch (error) {
    logger.error('[GET /api/parent/telegram-link]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
