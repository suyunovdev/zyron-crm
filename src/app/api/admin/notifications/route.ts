import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

// GET — fetch notifications (latest 50)
export async function GET() {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({ where: { read: false } });
  return NextResponse.json({ notifications, unreadCount });
}

// PATCH — mark as read
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const { id, all } = await req.json();

  if (all) {
    await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
  } else if (id) {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — clear old notifications
export async function DELETE() {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  await prisma.notification.deleteMany({
    where: { read: true },
  });
  return NextResponse.json({ ok: true });
}
