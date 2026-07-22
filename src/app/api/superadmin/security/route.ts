import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

const Schema = z.object({
  action: z.enum(['force-logout-all', 'force-logout-user']),
  targetUserId: z.string().optional(),
});

// Majburiy logout — tokenVersion'ni oshirib barcha eski tokenlarni bekor qiladi
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const parsed = await parseBody(req, Schema);
    if (parsed instanceof NextResponse) return parsed;

    if (parsed.action === 'force-logout-all') {
      // Superadminning o'zidan tashqari hammani chiqarish
      const r = await prisma.user.updateMany({
        where: { id: { not: auth.id } },
        data: { tokenVersion: { increment: 1 } },
      });
      await logAudit(auth, 'force-logout', 'system', null, `Barcha sessiyalar bekor qilindi (${r.count} foydalanuvchi)`);
      return NextResponse.json({ ok: true, affected: r.count });
    }

    if (!parsed.targetUserId) return NextResponse.json({ error: 'targetUserId kerak' }, { status: 400 });
    await prisma.user.update({ where: { id: parsed.targetUserId }, data: { tokenVersion: { increment: 1 } } });
    await logAudit(auth, 'force-logout', 'user', parsed.targetUserId, 'Foydalanuvchi sessiyasi bekor qilindi');
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[POST /api/superadmin/security]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
