import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;

    const { studentId, type, text } = await req.json();
    if (!studentId || !text) {
      return NextResponse.json({ error: 'studentId va text kerak' }, { status: 400 });
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

    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[DELETE /api/admin/notes]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
