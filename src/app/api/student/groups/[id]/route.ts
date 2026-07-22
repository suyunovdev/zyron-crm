import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth('student');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const gs = await prisma.groupStudent.findFirst({
    where: { studentId: auth.id, groupId: id },
    include: {
      group: {
        include: {
          teacher: { select: { id: true, name: true, phone: true } },
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              attendances: {
                where: { studentId: auth.id },
                select: { id: true, present: true },
              },
            },
          },
          students: {
            include: {
              student: { select: { id: true, name: true, status: true } },
            },
          },
          _count: { select: { students: true, lessons: true } },
        },
      },
    },
  });

  if (!gs) {
    return NextResponse.json({ error: 'Guruh topilmadi' }, { status: 404 });
  }

  return NextResponse.json(gs.group);
}
