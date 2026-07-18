import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notify';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'aka-uka-lead-webhook-2026';

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
    const secret = req.headers.get('x-webhook-secret');
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone, subject, message } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ error: 'name va phone kerak' }, { status: 400 });
    }

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

    return NextResponse.json({ ok: true, leadId: lead.leadId }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/webhook/lead]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
