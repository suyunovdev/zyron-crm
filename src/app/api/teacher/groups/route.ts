import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

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

  return NextResponse.json(groups);
}
