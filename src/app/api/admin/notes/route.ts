import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { logger } from '@/lib/logger';

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

    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[DELETE /api/admin/notes]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
