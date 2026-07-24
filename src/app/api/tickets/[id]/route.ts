import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { ticketRole, STATUS_LABELS } from '@/lib/tickets';
import { isAdminRole } from '@/lib/roles';
import { createNotification } from '@/lib/notify';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { scopedBranchId } from '@/lib/branch-scope';
import type { SessionUser } from '@/lib/auth';

async function loadTicket(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
}

/**
 * Filial admini boshqa filial ticketiga kira olmasligini ta'minlaydi.
 * Cheklovga tushsa NextResponse (403) qaytaradi, aks holda null.
 */
async function branchGuard(auth: SessionUser, role: string | null, ticketBranchId: string | null): Promise<NextResponse | null> {
  if (role === 'recipient' && isAdminRole(auth.role)) {
    const bId = await scopedBranchId(auth);
    if (bId && ticketBranchId !== bId) {
      return NextResponse.json({ error: 'Bu ticket boshqa filialga tegishli' }, { status: 403 });
    }
  }
  return null;
}

// Thread ko'rish + o'qilgan deb belgilash
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const ticket = await loadTicket(id);
    if (!ticket) return NextResponse.json({ error: 'Ticket topilmadi' }, { status: 404 });

    const role = ticketRole(auth, ticket);
    if (!role) return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    const guard = await branchGuard(auth, role, ticket.branchId);
    if (guard) return guard;

    // O'qilgan deb belgilash
    if (role === 'author' && ticket.teacherUnread) {
      await prisma.ticket.update({ where: { id }, data: { teacherUnread: false } });
    } else if (role === 'recipient' && ticket.recipientUnread) {
      await prisma.ticket.update({ where: { id }, data: { recipientUnread: false } });
    }

    return NextResponse.json({ ...ticket, myRole: role });
  } catch (error) {
    logger.error('[GET /api/tickets/[id]]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

const ReplySchema = z.object({ message: z.string().min(1).max(4000) });

// Javob yozish (thread)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const ticket = await loadTicket(id);
    if (!ticket) return NextResponse.json({ error: 'Ticket topilmadi' }, { status: 404 });

    const role = ticketRole(auth, ticket);
    if (!role) return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    const guard = await branchGuard(auth, role, ticket.branchId);
    if (guard) return guard;

    const parsed = await parseBody(req, ReplySchema);
    if (parsed instanceof NextResponse) return parsed;

    // Yopilgan ticketga javob — qayta ochamiz
    const reopen = ticket.status === 'closed' ? { status: 'open' } : {};
    await prisma.$transaction([
      prisma.ticketMessage.create({
        data: { ticketId: id, senderId: auth.id, senderName: auth.name, senderRole: auth.role, body: parsed.message },
      }),
      prisma.ticket.update({
        where: { id },
        data: role === 'author'
          ? { recipientUnread: true, teacherUnread: false, ...reopen }
          : { teacherUnread: true, recipientUnread: false, ...reopen },
      }),
    ]);

    // Admin-ticketga ustoz javob bersa → adminlarga bildirishnoma
    if (role === 'author' && ticket.recipientType === 'admin') {
      await createNotification({
        type: 'system', title: 'Ticketda yangi javob',
        message: `${auth.name}: ${ticket.subject}`, link: '/dashboard/admin/tickets',
        branchId: ticket.branchId,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[POST /api/tickets/[id]]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

const StatusSchema = z.object({ status: z.enum(['open', 'in_progress', 'resolved', 'closed']) });

// Status o'zgartirish — muallif (ustoz) yoki admin qabul qiluvchi
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const ticket = await loadTicket(id);
    if (!ticket) return NextResponse.json({ error: 'Ticket topilmadi' }, { status: 404 });

    const role = ticketRole(auth, ticket);
    const canManageStatus = role === 'author' || (role === 'recipient' && isAdminRole(auth.role));
    if (!canManageStatus) return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    const guard = await branchGuard(auth, role, ticket.branchId);
    if (guard) return guard;

    const parsed = await parseBody(req, StatusSchema);
    if (parsed instanceof NextResponse) return parsed;

    await prisma.ticket.update({ where: { id }, data: { status: parsed.status } });
    if (isAdminRole(auth.role)) {
      await logAudit(auth, 'update', 'ticket', id, `Ticket "${ticket.subject}" → ${STATUS_LABELS[parsed.status]}`);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[PATCH /api/tickets/[id]]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
