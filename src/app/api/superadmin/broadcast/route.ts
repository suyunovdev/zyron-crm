import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { computeDebtSummary } from '@/lib/billing';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { eskizConfigured, sendBulk } from '@/lib/eskiz';

export async function GET() {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;
    const campaigns = await prisma.smsCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    const gatewayReady = eskizConfigured();
    return NextResponse.json({ campaigns, gatewayReady });
  } catch (error) {
    logger.error('[GET /api/superadmin/broadcast]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

const Schema = z.object({
  message: z.string().min(1).max(1000),
  audience: z.enum(['leads', 'students', 'debtors', 'all']),
  channel: z.enum(['sms', 'telegram']).default('sms'),
});

async function resolveRecipients(audience: string): Promise<string[]> {
  if (audience === 'leads') {
    const leads = await prisma.lead.findMany({ select: { phone: true } });
    return leads.map(l => l.phone).filter(Boolean);
  }
  if (audience === 'students') {
    const s = await prisma.user.findMany({ where: { role: 'student', status: 'active' }, select: { phone: true } });
    return s.map(u => u.phone).filter((p): p is string => Boolean(p));
  }
  if (audience === 'debtors') {
    const debt = await computeDebtSummary();
    const ids = [...debt.balances.entries()].filter(([, b]) => b < 0).map(([id]) => id);
    const s = await prisma.user.findMany({ where: { id: { in: ids } }, select: { phone: true } });
    return s.map(u => u.phone).filter((p): p is string => Boolean(p));
  }
  const all = await prisma.user.findMany({ where: { phone: { not: null } }, select: { phone: true } });
  return all.map(u => u.phone).filter((p): p is string => Boolean(p));
}

// Xabar jo'natish. SMS — Eskiz.uz orqali (sozlangan bo'lsa). Telegram hali ulanmagan.
// Gateway sozlanmagan yoki qisman muvaffaqiyatsiz bo'lsa mos status qaytaradi.
async function dispatch(
  recipients: string[],
  message: string,
  channel: string,
): Promise<'sent' | 'partial' | 'failed' | 'queued'> {
  if (recipients.length === 0) return 'queued';
  if (channel === 'telegram') return 'queued'; // Telegram integratsiyasi keyingi faza
  // Demo rejimда HECH QACHON real SMS yubormaymiz (namuna raqamlarga jo'natmaslik uchun)
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return 'queued';
  if (!eskizConfigured()) return 'queued';

  const { sent, failed } = await sendBulk(recipients, message);
  logger.info('[broadcast] eskiz', { sent, failed, total: recipients.length });
  if (sent === 0) return 'failed';
  if (failed > 0) return 'partial';
  return 'sent';
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const parsed = await parseBody(req, Schema);
    if (parsed instanceof NextResponse) return parsed;

    // Idempotentlik (F2-3): jo'natishdan OLDIN kampaniyani DB'da "band qilamiz".
    // Bir xil (xabar, auditoriya, kanal) 30s ichida takror bosilsa — unique buzilib,
    // real SMS QAYTA jo'natilmaydi (ikki karra xarajatning oldini oladi).
    const bucket = Math.floor(Date.now() / 30_000);
    const dedupeKey = `${parsed.audience}:${parsed.channel}:${bucket}:${parsed.message}`;
    let campaign;
    try {
      campaign = await prisma.smsCampaign.create({
        data: {
          message: parsed.message, audience: parsed.audience, channel: parsed.channel,
          recipientCount: 0, status: 'queued', dedupeKey,
        },
      });
    } catch (e) {
      if (e && typeof e === 'object' && (e as { code?: string }).code === 'P2002') {
        return NextResponse.json({ error: 'Bu tarqatma allaqachon jo\'natildi (takror)' }, { status: 409 });
      }
      throw e;
    }

    const recipients = await resolveRecipients(parsed.audience);
    const status = await dispatch(recipients, parsed.message, parsed.channel);

    await prisma.smsCampaign.update({
      where: { id: campaign.id },
      data: { recipientCount: recipients.length, status },
    });
    await logAudit(auth, 'broadcast', 'system', campaign.id,
      `${parsed.channel} tarqatma → ${parsed.audience} (${recipients.length} ta, ${status})`);

    return NextResponse.json({ ok: true, recipientCount: recipients.length, status });
  } catch (error) {
    logger.error('[POST /api/superadmin/broadcast]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
