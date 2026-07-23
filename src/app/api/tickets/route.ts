import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { isAdminRole } from '@/lib/roles';
import { TICKET_CATEGORIES } from '@/lib/tickets';
import { createNotification } from '@/lib/notify';
import { logger } from '@/lib/logger';

// Rol bo'yicha ticket ro'yxati filtri
function scopeFor(user: { id: string; role: string }) {
  if (user.role === 'teacher') return { authorId: user.id };
  if (isAdminRole(user.role)) return { recipientType: 'admin' };
  if (user.role === 'parent') return { recipientId: user.id };
  return { id: '__none__' }; // boshqa rollar uchun hech narsa
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const tickets = await prisma.ticket.findMany({
      where: scopeFor(auth),
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
    });

    const isAuthor = auth.role === 'teacher';
    const list = tickets.map(t => ({
      id: t.id, subject: t.subject, category: t.category, priority: t.priority, status: t.status,
      recipientType: t.recipientType, relatedStudentName: t.relatedStudentName,
      authorName: t.authorName, createdAt: t.createdAt, updatedAt: t.updatedAt,
      messageCount: t._count.messages,
      lastMessage: t.messages[0]?.body || '',
      unread: isAuthor ? t.teacherUnread : t.recipientUnread,
    }));
    return NextResponse.json({ tickets: list });
  } catch (error) {
    logger.error('[GET /api/tickets]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

const CreateSchema = z.object({
  recipientType: z.enum(['admin', 'parent']),
  studentId: z.string().optional(), // parent uchun majburiy; admin uchun ixtiyoriy kontekst
  category: z.enum(TICKET_CATEGORIES),
  subject: z.string().min(1).max(160),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  message: z.string().min(1).max(4000),
});

// Ticket yaratish — faqat ustoz
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('teacher');
    if (auth instanceof NextResponse) return auth;

    const parsed = await parseBody(req, CreateSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { recipientType, studentId, category, subject, priority, message } = parsed;

    let recipientId: string | null = null;
    let relatedStudentId: string | null = null;
    let relatedStudentName: string | null = null;

    if (recipientType === 'parent') {
      if (!studentId) return NextResponse.json({ error: "Ota-ona uchun o'quvchi tanlang" }, { status: 400 });
      // O'quvchi shu ustoz guruhida bo'lishi shart
      const gs = await prisma.groupStudent.findFirst({
        where: { studentId, group: { teacherId: auth.id } },
        select: { student: { select: { id: true, name: true, parentId: true } } },
      });
      if (!gs) return NextResponse.json({ error: "Bu o'quvchi sizning guruhingizda emas" }, { status: 403 });
      if (!gs.student.parentId) return NextResponse.json({ error: "O'quvchiga ota-ona bog'lanmagan" }, { status: 400 });
      recipientId = gs.student.parentId;
      relatedStudentId = gs.student.id;
      relatedStudentName = gs.student.name;
    } else if (studentId) {
      const s = await prisma.user.findUnique({ where: { id: studentId }, select: { id: true, name: true } });
      if (s) { relatedStudentId = s.id; relatedStudentName = s.name; }
    }

    const ticket = await prisma.ticket.create({
      data: {
        authorId: auth.id, authorName: auth.name,
        recipientType, recipientId, relatedStudentId, relatedStudentName,
        category, subject, priority,
        teacherUnread: false, recipientUnread: true,
        messages: { create: { senderId: auth.id, senderName: auth.name, senderRole: 'teacher', body: message } },
      },
    });

    // Bildirishnoma
    if (recipientType === 'admin') {
      await createNotification({
        type: 'system',
        title: 'Yangi ticket (ustozdan)',
        message: `${auth.name}: ${subject}`,
        link: `/dashboard/admin/tickets`,
      });
    }
    // Ota-ona uchun bildirishnoma badge orqali ko'rinadi (parent'da qo'ng'iroq yo'q)

    return NextResponse.json({ id: ticket.id }, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/tickets]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
