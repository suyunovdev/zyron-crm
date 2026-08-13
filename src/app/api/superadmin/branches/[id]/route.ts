import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { computeDebtSummary } from '@/lib/billing';

// Filial detali — barcha ma'lumot + analitika (superadmin)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) return NextResponse.json({ error: 'Filial topilmadi' }, { status: 404 });

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const B = { branchId: id };

    const [
      activeStudents, totalStudents, frozenStudents, archivedStudents,
      groupsAll, activeGroups, teachersCount, adminsCount,
      monthPayments, debt,
      attPresent, attTotal,
      groups, teachers, admins, students, leads, payments,
      leadsTotal,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'student', status: 'active', ...B } }),
      prisma.user.count({ where: { role: 'student', ...B } }),
      prisma.user.count({ where: { role: 'student', status: 'frozen', ...B } }),
      prisma.user.count({ where: { role: 'student', status: 'archived', ...B } }),
      prisma.group.count({ where: B }),
      prisma.group.count({ where: { ...B, status: 'active' } }),
      prisma.user.count({ where: { role: 'teacher', ...B } }),
      prisma.user.count({ where: { role: 'admin', ...B } }),
      prisma.payment.findMany({ where: { month: currentMonth, student: B }, select: { amount: true } }),
      computeDebtSummary(id),
      prisma.attendance.count({ where: { present: true, lesson: { scheduledDate: { startsWith: currentMonth }, group: B } } }),
      prisma.attendance.count({ where: { lesson: { scheduledDate: { startsWith: currentMonth }, group: B } } }),
      prisma.group.findMany({ where: B, orderBy: { name: 'asc' }, select: {
        id: true, name: true, subject: true, status: true, time: true, dayType: true, room: true,
        teacher: { select: { id: true, name: true } }, _count: { select: { students: true } } } }),
      prisma.user.findMany({ where: { role: 'teacher', ...B }, orderBy: { name: 'asc' }, select: {
        id: true, name: true, subject: true, level: true, phone: true, _count: { select: { teacherGroups: true } } } }),
      prisma.user.findMany({ where: { role: 'admin', ...B }, orderBy: { name: 'asc' }, select: {
        id: true, name: true, login: true, phone: true } }),
      prisma.user.findMany({ where: { role: 'student', status: { in: ['active', 'frozen'] }, ...B }, orderBy: { name: 'asc' }, select: {
        id: true, name: true, phone: true, status: true } }),
      prisma.lead.findMany({ where: B, orderBy: { createdAt: 'desc' }, take: 20, select: {
        id: true, name: true, phone: true, status: true, source: true, createdAt: true } }),
      prisma.payment.findMany({ where: { student: B }, orderBy: { createdAt: 'desc' }, take: 15, select: {
        id: true, amount: true, month: true, method: true, type: true, createdAt: true, student: { select: { name: true } } } }),
      prisma.lead.count({ where: B }),
    ]);

    const monthRevenue = monthPayments.reduce((s, p) => s + p.amount, 0);
    const collectionRate = activeStudents > 0
      ? Math.round(((activeStudents - debt.debtorCount) / activeStudents) * 100) : 100;
    const attendancePercent = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

    return NextResponse.json({
      branch,
      kpi: {
        activeStudents, totalStudents, frozenStudents, archivedStudents,
        groups: groupsAll, activeGroups, teachers: teachersCount, admins: adminsCount,
        monthRevenue, totalDebt: debt.totalDebt, debtors: debt.debtorCount,
        collectionRate, attendancePercent, leadsTotal,
      },
      groups, teachers, admins, students, leads, payments,
    });
  } catch (error) {
    logger.error('[GET /api/superadmin/branches/[id]]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  address: z.string().max(200).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    const parsed = await parseBody(req, UpdateSchema);
    if (parsed instanceof NextResponse) return parsed;

    const branch = await prisma.branch.update({ where: { id }, data: parsed });
    await logAudit(auth, 'update', 'branch', id, `Filial yangilandi: ${branch.name}`);
    return NextResponse.json(branch);
  } catch (error) {
    logger.error('[PATCH /api/superadmin/branches/[id]]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;

    // Filialga bog'langan user/guruhlarni bo'shatamiz (o'chirmaymiz)
    await prisma.$transaction([
      prisma.user.updateMany({ where: { branchId: id }, data: { branchId: null } }),
      prisma.group.updateMany({ where: { branchId: id }, data: { branchId: null } }),
      prisma.branch.delete({ where: { id } }),
    ]);
    await logAudit(auth, 'delete', 'branch', id, 'Filial o\'chirildi');
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[DELETE /api/superadmin/branches/[id]]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
