import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { scopedBranchId } from '@/lib/branch-scope';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, name: true } },
        students: {
          include: { student: { select: { id: true, name: true, phone: true, status: true } } },
        },
        lessons: {
          orderBy: { order: 'asc' },
          include: { attendances: true },
        },
        _count: { select: { students: true, lessons: true } },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Guruh topilmadi' }, { status: 404 });
    }

    // Filial cheklovi: boshqa filial guruhini ko'rib bo'lmaydi
    const bId = await scopedBranchId(auth);
    if (bId && group.branchId !== bId) {
      return NextResponse.json({ error: 'Bu guruh boshqa filialga tegishli' }, { status: 403 });
    }

    return NextResponse.json(group);
  } catch (error) {
    logger.error('[GET /api/admin/groups/[id]]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
