import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

export async function GET() {
  const auth = await requireAuth('student');
  if (auth instanceof NextResponse) return auth;

  // Get student's groups with price info
  const groupStudents = await prisma.groupStudent.findMany({
    where: { studentId: auth.id },
    include: {
      group: {
        select: { id: true, name: true, price: true, lessonsPerMonth: true },
      },
    },
  });

  // Count attended lessons per group
  let totalCost = 0;
  const groupDetails = [];

  for (const gs of groupStudents) {
    const { group } = gs;
    const perLesson = group.lessonsPerMonth > 0
      ? group.price / group.lessonsPerMonth
      : 0;

    const attendedCount = await prisma.attendance.count({
      where: {
        studentId: auth.id,
        present: true,
        lesson: { groupId: group.id },
      },
    });

    const cost = Math.round(attendedCount * perLesson);
    totalCost += cost;

    groupDetails.push({
      groupId: group.id,
      groupName: group.name,
      price: group.price,
      lessonsPerMonth: group.lessonsPerMonth,
      attendedLessons: attendedCount,
      cost,
    });
  }

  // Total payments
  const payments = await prisma.payment.aggregate({
    where: { studentId: auth.id },
    _sum: { amount: true },
  });
  const totalPaid = payments._sum.amount || 0;

  const balance = totalPaid - totalCost;

  return NextResponse.json({
    balance,
    totalPaid,
    totalCost,
    groups: groupDetails,
  });
}
