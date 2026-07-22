import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

const Schema = z.object({
  action: z.enum(['clear-rejected-leads', 'clear-read-notifications', 'clear-old-audit']),
  confirm: z.literal('TASDIQLAYMAN'),
});

// Xavfli amallar — faqat superadmin, aniq tasdiq bilan (qaytarib bo'lmaydi)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const parsed = await parseBody(req, Schema);
    if (parsed instanceof NextResponse) return parsed;

    let count = 0;
    let label = '';
    switch (parsed.action) {
      case 'clear-rejected-leads': {
        const r = await prisma.lead.deleteMany({ where: { status: 'rejected' } });
        count = r.count; label = 'Rad etilgan lidlar';
        break;
      }
      case 'clear-read-notifications': {
        const r = await prisma.notification.deleteMany({ where: { read: true } });
        count = r.count; label = 'O\'qilgan bildirishnomalar';
        break;
      }
      case 'clear-old-audit': {
        const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000);
        const r = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
        count = r.count; label = '90 kundan eski audit yozuvlari';
        break;
      }
    }

    await logAudit(auth, 'danger', 'system', null, `${label} tozalandi (${count} ta)`);
    return NextResponse.json({ ok: true, deleted: count, label });
  } catch (error) {
    logger.error('[POST /api/superadmin/danger]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
