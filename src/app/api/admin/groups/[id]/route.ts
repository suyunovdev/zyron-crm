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

    // Oydan-oyga to'lov summasi (davomat jadvalidagi badge + summa uchun) — bitta groupBy so'rov.
    // Kalit "YYYY-MM" (selectedMonth bilan bir xil format). To'lov o'quvchiga bog'langan
    // (guruhga emas), shuning uchun bu o'quvchining o'sha oydagi umumiy to'lovi.
    const studentIds = group.students.map(gs => gs.student.id);
    const paidByStudent = new Map<string, Record<string, number>>();
    if (studentIds.length) {
      const rows = await prisma.payment.groupBy({
        by: ['studentId', 'month'],
        where: { studentId: { in: studentIds } },
        _sum: { amount: true },
      });
      for (const r of rows) {
        const m = paidByStudent.get(r.studentId) ?? {};
        m[r.month] = (m[r.month] || 0) + (r._sum.amount || 0);
        paidByStudent.set(r.studentId, m);
      }
    }
    const withPaid = {
      ...group,
      students: group.students.map(gs => ({
        ...gs,
        student: { ...gs.student, paidByMonth: paidByStudent.get(gs.student.id) ?? {} },
      })),
    };

    return NextResponse.json(withPaid);
  } catch (error) {
    logger.error('[GET /api/admin/groups/[id]]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
