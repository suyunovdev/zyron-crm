import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { computePayroll } from '@/lib/payroll';
import { getSetting } from '@/lib/settings';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = new URL(req.url).searchParams.get('month') || currentMonth;

    const defaultShare = parseInt(await getSetting('defaultSalaryShare')) || 0;
    const payroll = await computePayroll(defaultShare, month);
    const totalSalary = payroll.reduce((s, p) => s + p.salary, 0);
    const totalRevenue = payroll.reduce((s, p) => s + p.revenue, 0);
    return NextResponse.json({ payroll, totalSalary, totalRevenue, defaultShare, month });
  } catch (error) {
    logger.error('[GET /api/superadmin/payroll]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

const SetShareSchema = z.object({
  teacherId: z.string().min(1),
  salaryShare: z.coerce.number().int().min(0).max(100),
});

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const parsed = await parseBody(req, SetShareSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { teacherId, salaryShare } = parsed;

    const t = await prisma.user.findUnique({ where: { id: teacherId }, select: { role: true, name: true } });
    if (!t || t.role !== 'teacher') return NextResponse.json({ error: 'O\'qituvchi topilmadi' }, { status: 404 });

    await prisma.user.update({ where: { id: teacherId }, data: { salaryShare } });
    await logAudit(auth, 'update', 'user', teacherId, `${t.name} ustoz ulushi → ${salaryShare}%`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[PATCH /api/superadmin/payroll]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
