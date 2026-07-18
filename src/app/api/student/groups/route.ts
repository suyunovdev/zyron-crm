import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

// Student's groups
export async function GET() {
  const auth = await requireAuth('student');
  if (auth instanceof NextResponse) return auth;

  const groupStudents = await prisma.groupStudent.findMany({
    where: { studentId: auth.id },
    include: {
      group: {
        include: {
          teacher: { select: { id: true, name: true } },
          lessons: {
            orderBy: { order: 'asc' },
            select: {
              id: true, topic: true, scheduledDate: true,
              scheduledTime: true, duration: true, order: true,
            },
          },
          _count: { select: { students: true } },
        },
      },
    },
  });

  const groups = groupStudents.map(gs => gs.group);
  return NextResponse.json(groups);
}
