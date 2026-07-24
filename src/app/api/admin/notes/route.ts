import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { logger } from '@/lib/logger';
import { scopedBranchId } from '@/lib/branch-scope';

const NoteSchema = z.object({
  studentId: z.string().min(1),
  type: z.string().max(40).optional(),
  text: z.string().min(1, 'matn kerak').max(2000),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;

    const parsed = await parseBody(req, NoteSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { studentId, type, text } = parsed;

    // Filial cheklovi: boshqa filial o'quvchisiga izoh yozib bo'lmaydi
    const bId = await scopedBranchId(auth);
    if (bId) {
      const s = await prisma.user.findUnique({ where: { id: studentId }, select: { branchId: true } });
      if (!s) return NextResponse.json({ error: 'O\'quvchi topilmadi' }, { status: 404 });
      if (s.branchId !== bId) return NextResponse.json({ error: 'O\'quvchi boshqa filialga tegishli' }, { status: 403 });
    }

    const note = await prisma.note.create({
      data: { studentId, type: type || 'comment', text },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/admin/notes]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    // Filial cheklovi: boshqa filial o'quvchisi izohini o'chirib bo'lmaydi
    const bId = await scopedBranchId(auth);
    if (bId) {
      const n = await prisma.note.findUnique({ where: { id }, select: { student: { select: { branchId: true } } } });
      if (!n) return NextResponse.json({ error: 'Izoh topilmadi' }, { status: 404 });
      if (n.student.branchId !== bId) return NextResponse.json({ error: 'Boshqa filialga tegishli' }, { status: 403 });
    }

    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[DELETE /api/admin/notes]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
