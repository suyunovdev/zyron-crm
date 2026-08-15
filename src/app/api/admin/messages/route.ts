import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { scopedBranchId } from '@/lib/branch-scope';
import { computeDebtSummary } from '@/lib/billing';
import { createNotification } from '@/lib/notify';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

// Admin ota-onalarga xabar yuboradi: bitta o'quvchi / guruh / barcha faol.
export async function GET() {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;
    const messages = await prisma.message.findMany({
      where: { teacherId: auth.id, senderRole: 'admin' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ messages });
  } catch (error) {
    logger.error('[GET /api/admin/messages]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

const SendSchema = z.object({
  mode: z.enum(['single', 'group', 'all', 'selected']),
  body: z.string().min(1, 'xabar matni kerak').max(2000),
  studentId: z.string().optional(),
  studentIds: z.array(z.string()).max(2000).optional(),
  groupId: z.string().optional(),
  // "Barcha" (all) rejimida segment/holat filtri
  status: z.enum(['active', 'frozen', 'archived', 'debtors', 'all']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;
    const parsed = await parseBody(req, SendSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { mode, body, studentId, studentIds, groupId } = parsed;
    const segment = parsed.status || 'active';

    const bId = await scopedBranchId(auth);
    const branchWhere = bId ? { branchId: bId } : {};

    // Qabul qiluvchilar ro'yxati: {studentId, studentName, parentId}
    let recipients: { id: string; name: string; parentId: string | null }[] = [];

    if (mode === 'single') {
      if (!studentId) return NextResponse.json({ error: 'O\'quvchi tanlanmagan' }, { status: 400 });
      const s = await prisma.user.findFirst({
        where: { id: studentId, role: 'student', ...branchWhere },
        select: { id: true, name: true, parentId: true },
      });
      if (!s) return NextResponse.json({ error: 'O\'quvchi topilmadi' }, { status: 404 });
      recipients = [s];
    } else if (mode === 'group') {
      if (!groupId) return NextResponse.json({ error: 'Guruh tanlanmagan' }, { status: 400 });
      const g = await prisma.group.findFirst({ where: { id: groupId, ...branchWhere }, select: { id: true } });
      if (!g) return NextResponse.json({ error: 'Guruh topilmadi' }, { status: 404 });
      const gs = await prisma.groupStudent.findMany({
        where: { groupId, student: { status: 'active' } },
        select: { student: { select: { id: true, name: true, parentId: true } } },
      });
      recipients = gs.map(x => x.student);
    } else if (mode === 'selected') {
      const ids = studentIds || [];
      if (ids.length === 0) return NextResponse.json({ error: 'O\'quvchi tanlanmagan' }, { status: 400 });
      recipients = await prisma.user.findMany({
        where: { id: { in: ids }, role: 'student', ...branchWhere },
        select: { id: true, name: true, parentId: true },
      });
    } else {
      // "Barcha" rejimi — segment (holat / qarzdorlar) bo'yicha
      if (segment === 'debtors') {
        const debt = await computeDebtSummary(bId);
        const debtorIds = [...debt.balances.entries()].filter(([, b]) => b < 0).map(([id]) => id);
        recipients = debtorIds.length
          ? await prisma.user.findMany({
              where: { id: { in: debtorIds }, role: 'student', ...branchWhere },
              select: { id: true, name: true, parentId: true },
            })
          : [];
      } else {
        // active | frozen | archived | all (statussiz)
        const statusWhere = segment === 'all' ? {} : { status: segment };
        recipients = await prisma.user.findMany({
          where: { role: 'student', ...statusWhere, ...branchWhere },
          select: { id: true, name: true, parentId: true },
        });
      }
    }

    // Faqat ota-onasi bor o'quvchilar
    const withParent = recipients.filter(r => r.parentId);
    if (withParent.length === 0) {
      return NextResponse.json({ error: 'Ota-onasi bog\'langan o\'quvchi topilmadi', sent: 0 }, { status: 400 });
    }

    const result = await prisma.message.createMany({
      data: withParent.map(r => ({
        teacherId: auth.id,
        teacherName: auth.name,
        senderRole: 'admin',
        studentId: r.id,
        studentName: r.name,
        parentId: r.parentId!,
        body,
      })),
    });

    // Bitta xabar bo'lsa — ota-onaga bildirishnoma (ommaviyда shovqin qilmaymiz)
    if (mode === 'single' && withParent[0].parentId) {
      await createNotification({
        type: 'system', title: 'Yangi xabar',
        message: `Administratordan xabar: ${withParent[0].name} haqida`,
        link: '/dashboard/parent/messages', branchId: bId,
      }).catch(() => {});
    }

    const scopeLabel = mode === 'all' ? `all/${segment}` : mode;
    await logAudit(auth, 'create', 'message', '', `Admin xabar (${scopeLabel}) → ${result.count} ota-ona`);
    return NextResponse.json({ ok: true, sent: result.count }, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/admin/messages]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
