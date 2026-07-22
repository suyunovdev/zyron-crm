import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { getPagination, paginated } from '@/lib/paginate';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const entity = searchParams.get('entity');
    const where = entity ? { entity } : {};

    const pg = getPagination(searchParams, 50) ?? { page: 1, limit: 100, skip: 0, take: 100 };
    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pg.skip, take: pg.take }),
      prisma.auditLog.count({ where }),
    ]);
    return NextResponse.json(paginated(data, total, pg));
  } catch (error) {
    logger.error('[GET /api/superadmin/audit]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
