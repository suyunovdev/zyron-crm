import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// Ota-onaga kelgan xabarlar (ustozlardan). Ota-ona faqat o'qiydi.
export async function GET() {
  try {
    const auth = await requireAuth('parent');
    if (auth instanceof NextResponse) return auth;
    const messages = await prisma.message.findMany({
      where: { parentId: auth.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const unread = messages.filter(m => !m.read).length;
    return NextResponse.json({ messages, unread });
  } catch (error) {
    logger.error('[GET /api/parent/messages]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// O'qilgan deb belgilash (bitta yoki hammasi)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth('parent');
    if (auth instanceof NextResponse) return auth;
    const { id, all } = await req.json();
    if (all) {
      await prisma.message.updateMany({ where: { parentId: auth.id, read: false }, data: { read: true } });
    } else if (id) {
      await prisma.message.updateMany({ where: { id, parentId: auth.id }, data: { read: true } });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[PATCH /api/parent/messages]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
