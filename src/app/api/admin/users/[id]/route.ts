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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        login: true,
        rawPass: true,
        name: true,
        phone: true,
        role: true,
        subject: true,
        status: true,
        level: true,
        avatar: true,
        branchId: true,
        createdAt: true,
        parent: { select: { id: true, login: true, name: true, rawPass: true } },
        teacherGroups: {
          include: {
            students: { include: { student: { select: { id: true, name: true, status: true } } } },
            _count: { select: { students: true, lessons: true } },
          },
        },
        groupStudents: {
          include: {
            group: {
              include: {
                teacher: { select: { id: true, name: true } },
                _count: { select: { students: true, lessons: true } },
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            month: true,
            method: true,
            note: true,
            createdAt: true,
          },
        },
        attendances: {
          include: {
            lesson: {
              select: {
                id: true,
                scheduledDate: true,
                scheduledTime: true,
                order: true,
                groupId: true,
              },
            },
          },
          orderBy: { markedAt: 'desc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            text: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }

    // Filial cheklovi: boshqa filial foydalanuvchisini ko'rib bo'lmaydi
    const bId = await scopedBranchId(auth);
    if (bId && user.branchId !== bId) {
      return NextResponse.json({ error: 'Bu foydalanuvchi boshqa filialga tegishli' }, { status: 403 });
    }

    return NextResponse.json(user);
  } catch (error) {
    logger.error('[GET /api/admin/users/[id]]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
