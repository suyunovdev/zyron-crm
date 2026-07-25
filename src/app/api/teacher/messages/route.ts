import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { logger } from '@/lib/logger';

// Ustoz o'z o'quvchisining ota-onasiga yozgan xabarlari (bir tomonlama).
export async function GET() {
  try {
    const auth = await requireAuth('teacher');
    if (auth instanceof NextResponse) return auth;
    const messages = await prisma.message.findMany({
      where: { teacherId: auth.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ messages });
  } catch (error) {
    logger.error('[GET /api/teacher/messages]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

const SendSchema = z.object({
  studentId: z.string().min(1),
  body: z.string().min(1, 'xabar matni kerak').max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('teacher');
    if (auth instanceof NextResponse) return auth;

    const parsed = await parseBody(req, SendSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { studentId, body } = parsed;

    // O'quvchi shu ustozning guruhida bo'lishi shart
    const gs = await prisma.groupStudent.findFirst({
      where: { studentId, group: { teacherId: auth.id } },
      select: { student: { select: { id: true, name: true, parentId: true } } },
    });
    if (!gs) return NextResponse.json({ error: "Bu o'quvchi sizning guruhingizda emas" }, { status: 403 });
    if (!gs.student.parentId) return NextResponse.json({ error: "O'quvchiga ota-ona bog'lanmagan" }, { status: 400 });

    const msg = await prisma.message.create({
      data: {
        teacherId: auth.id,
        teacherName: auth.name,
        studentId: gs.student.id,
        studentName: gs.student.name,
        parentId: gs.student.parentId,
        body,
      },
    });
    return NextResponse.json({ id: msg.id }, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/teacher/messages]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
