import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { parseBody, zTrim } from '@/lib/validate';
import { notifyStaff } from '@/lib/telegram-funnel';
import { staffLeadText } from '@/lib/funnel-messages';

const LeadSchema = z.object({
  name: zTrim(120, 1),
  phone: z.string().min(3).max(32),
  subject: z.string().max(40).optional(),
  message: z.string().max(2000).optional(),
});

const subjectLabels: Record<string, string> = {
  math: 'Matematika',
  physics: 'Fizika',
  chemistry: 'Kimyo',
  biology: 'Biologiya',
  uzbek: 'Ona tili va adabiyot',
  english: 'Ingliz tili',
  russian: 'Rus tili',
  turkish: 'Turk tili',
  it: 'IT (Axborot texnologiyalari)',
  sat: 'SAT',
  other: 'Boshqa fan',
};

export async function POST(req: NextRequest) {
  try {
    const expected = process.env.WEBHOOK_SECRET;
    if (!expected) {
      return NextResponse.json({ error: 'WEBHOOK_SECRET sozlanmagan' }, { status: 500 });
    }
    const secret = req.headers.get('x-webhook-secret');
    if (secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = await parseBody(req, LeadSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { name, phone, subject, message } = parsed;

    const prefix = name.charAt(0).toLowerCase();
    const randomId = Math.random().toString(36).substring(2, 6);

    const lead = await prisma.lead.create({
      data: {
        leadId: `${prefix}${randomId}`,
        name,
        phone,
        source: 'website',
        note: [
          subject ? `Fan: ${subjectLabels[subject] || subject}` : '',
          message || '',
        ].filter(Boolean).join(' | ') || null,
      },
    });

    const subjectText = subject ? (subjectLabels[subject] || subject) : '';
    await createNotification({
      type: 'lead',
      title: 'Yangi lid saytdan!',
      message: `${name} — ${phone}${subjectText ? ` (${subjectText})` : ''}`,
      link: '/dashboard/admin/leads',
    });

    // Telegram staff guruhga (agar sozlangan) — bot lidlari bilan bir xil joyga
    await notifyStaff(staffLeadText({
      name, phone, subject: subjectText || null,
      source: 'Veb-sayt (landing)', origin: 'Veb-sayt', leadId: lead.leadId,
    }));

    return NextResponse.json({ ok: true, leadId: lead.leadId }, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/webhook/lead]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
