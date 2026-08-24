import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { currentMonthTz } from '@/lib/date';

// Teacher's own groups
export async function GET() {
  const auth = await requireAuth('teacher');
  if (auth instanceof NextResponse) return auth;

  const groups = await prisma.group.findMany({
    where: { teacherId: auth.id, status: 'active' },
    include: {
      students: {
        include: { student: { select: { id: true, name: true, phone: true, status: true } } },
      },
      lessons: {
        orderBy: { order: 'asc' },
        include: {
          attendances: true,
        },
      },
      _count: { select: { students: true, lessons: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Joriy oy to'lovi (badge uchun) — bitta groupBy so'rov, so'ng har o'quvchiga biriktiramiz
  const paidSet = await paidThisMonthSet(
    [...new Set(groups.flatMap(g => g.students.map(gs => gs.student.id)))],
  );
  const withPaid = groups.map(g => ({
    ...g,
    students: g.students.map(gs => ({
      ...gs,
      student: { ...gs.student, paidThisMonth: paidSet.has(gs.student.id) },
    })),
  }));

  return NextResponse.json(withPaid);
}

/** Joriy oyda musbat to'lov qilgan o'quvchilar to'plami (Payment.month = joriy oy). */
async function paidThisMonthSet(studentIds: string[]): Promise<Set<string>> {
  if (studentIds.length === 0) return new Set();
  const rows = await prisma.payment.groupBy({
    by: ['studentId'],
    where: { studentId: { in: studentIds }, month: currentMonthTz() },
    _sum: { amount: true },
  });
  return new Set(rows.filter(r => (r._sum.amount || 0) > 0).map(r => r.studentId));
}
