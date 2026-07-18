import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

// Student views own attendance
export async function GET(req: NextRequest) {
  const auth = await requireAuth('student');
  if (auth instanceof NextResponse) return auth;

  const groupId = req.nextUrl.searchParams.get('groupId');

  const where: Record<string, unknown> = { studentId: auth.id };
  if (groupId) {
    where.lesson = { groupId };
  }

  const attendances = await prisma.attendance.findMany({
    where,
    include: {
      lesson: { select: { id: true, topic: true, scheduledDate: true, scheduledTime: true, groupId: true } },
    },
    orderBy: { markedAt: 'desc' },
  });

  return NextResponse.json(attendances);
}
