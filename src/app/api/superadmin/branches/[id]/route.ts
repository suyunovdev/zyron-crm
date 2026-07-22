import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

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
