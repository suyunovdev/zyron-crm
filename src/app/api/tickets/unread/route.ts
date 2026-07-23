import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { isAdminRole } from '@/lib/roles';
import { logger } from '@/lib/logger';

// Joriy foydalanuvchi uchun o'qilmagan ticketlar soni (nav badge)
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    let count = 0;
    if (auth.role === 'teacher') {
      count = await prisma.ticket.count({ where: { authorId: auth.id, teacherUnread: true } });
    } else if (isAdminRole(auth.role)) {
      count = await prisma.ticket.count({ where: { recipientType: 'admin', recipientUnread: true } });
    } else if (auth.role === 'parent') {
      count = await prisma.ticket.count({ where: { recipientId: auth.id, recipientUnread: true } });
    }
    return NextResponse.json({ count });
  } catch (error) {
    logger.error('[GET /api/tickets/unread]', error);
    return NextResponse.json({ count: 0 });
  }
}
