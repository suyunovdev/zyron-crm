import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

// Barcha ma'lumotni JSON sifatida eksport qilish (zaxira/ko'chirish uchun)
export async function GET() {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const [users, groups, groupStudents, lessons, attendances, payments, notes, leads, branches, settings] =
      await Promise.all([
        prisma.user.findMany(),
        prisma.group.findMany(),
        prisma.groupStudent.findMany(),
        prisma.lesson.findMany(),
        prisma.attendance.findMany(),
        prisma.payment.findMany(),
        prisma.note.findMany(),
        prisma.lead.findMany(),
        prisma.branch.findMany(),
        prisma.setting.findMany(),
      ]);

    await logAudit(auth, 'export', 'system', null, 'To\'liq ma\'lumot eksport qilindi');

    const dump = {
      exportedAt: new Date().toISOString(),
      counts: {
        users: users.length, groups: groups.length, lessons: lessons.length,
        attendances: attendances.length, payments: payments.length, leads: leads.length,
      },
      data: { users, groups, groupStudents, lessons, attendances, payments, notes, leads, branches, settings },
    };

    return new NextResponse(JSON.stringify(dump, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="zyron-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    logger.error('[GET /api/superadmin/export]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
