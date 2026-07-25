import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

// Ota-ona uchun o'qilmagan xabarlar soni (nav badge)
export async function GET() {
  try {
    const auth = await requireAuth('parent');
    if (auth instanceof NextResponse) return auth;
    const count = await prisma.message.count({ where: { parentId: auth.id, read: false } });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
