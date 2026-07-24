import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { scopedBranchId } from '@/lib/branch-scope';

// Filial cheklovi: filial admini o'z filiali + global (branchId=null) bildirishnomalarni ko'radi
function branchScope(bId: string | null) {
  return bId ? { OR: [{ branchId: bId }, { branchId: null }] } : {};
}

// GET — fetch notifications (latest 50)
export async function GET() {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const bId = await scopedBranchId(auth);
  const scope = branchScope(bId);

  const notifications = await prisma.notification.findMany({
    where: scope,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({ where: { read: false, ...scope } });
  return NextResponse.json({ notifications, unreadCount });
}

// PATCH — mark as read
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const { id, all } = await req.json();
  const bId = await scopedBranchId(auth);
  const scope = branchScope(bId);

  if (all) {
    await prisma.notification.updateMany({
      where: { read: false, ...scope },
      data: { read: true },
    });
  } else if (id) {
    // updateMany + scope: boshqa filial bildirishnomasini belgilab bo'lmaydi
    await prisma.notification.updateMany({
      where: { id, ...scope },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — clear old notifications
export async function DELETE() {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const bId = await scopedBranchId(auth);
  await prisma.notification.deleteMany({
    where: { read: true, ...branchScope(bId) },
  });
  return NextResponse.json({ ok: true });
}
