import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;
    const branches = await prisma.branch.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { users: true, groups: true } } },
    });
    return NextResponse.json({ branches });
  } catch (error) {
    logger.error('[GET /api/superadmin/branches]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

const BranchSchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(200).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;
    const parsed = await parseBody(req, BranchSchema);
    if (parsed instanceof NextResponse) return parsed;

    const branch = await prisma.branch.create({ data: parsed });
    await logAudit(auth, 'create', 'branch', branch.id, `Filial yaratildi: ${branch.name}`);
    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/superadmin/branches]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
