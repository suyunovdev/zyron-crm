import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { scopedBranchId } from '@/lib/branch-scope';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import type { SessionUser } from '@/lib/auth';

// Admin dars jadvalini tahrirlaydi: alohida dars qo'shish / sana-vaqt-mavzu / o'chirish.

// Guruh admin filialiga tegishlimi? (scoped bo'lsa) — aks holda 403 qaytaradi.
async function checkBranch(auth: SessionUser, groupId: string) {
  const bId = await scopedBranchId(auth);
  if (!bId) return null;
  const g = await prisma.group.findUnique({ where: { id: groupId }, select: { branchId: true } });
  if (!g || g.branchId !== bId) return NextResponse.json({ error: 'Bu guruh boshqa filialga tegishli' }, { status: 403 });
  return null;
}

const CreateSchema = z.object({
  groupId: z.string().min(1),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'sana YYYY-MM-DD'),
  scheduledTime: z.string().max(10).optional(),
  topic: z.string().max(300).optional().nullable(),
});

// Alohida dars qo'shish
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;
    const parsed = await parseBody(req, CreateSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { groupId, scheduledDate, scheduledTime, topic } = parsed;

    const guard = await checkBranch(auth, groupId);
    if (guard) return guard;

    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { time: true } });
    if (!group) return NextResponse.json({ error: 'Guruh topilmadi' }, { status: 404 });

    const dup = await prisma.lesson.findFirst({ where: { groupId, scheduledDate } });
    if (dup) return NextResponse.json({ error: 'Bu sanada dars allaqachon mavjud' }, { status: 409 });

    const last = await prisma.lesson.findFirst({ where: { groupId }, orderBy: { order: 'desc' }, select: { order: true } });
    const lesson = await prisma.lesson.create({
      data: {
        groupId, scheduledDate,
        scheduledTime: scheduledTime || group.time || '14:00',
        order: (last?.order ?? 0) + 1,
        topic: topic || null,
      },
    });
    await logAudit(auth, 'create', 'lesson', lesson.id, `Dars qo'shildi: ${scheduledDate}`);
    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/admin/lessons]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

const EditSchema = z.object({
  id: z.string().min(1),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduledTime: z.string().max(10).optional(),
  topic: z.string().max(300).optional().nullable(),
});

// Dars tahrirlash (sana / vaqt / mavzu)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;
    const parsed = await parseBody(req, EditSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { id, scheduledDate, scheduledTime, topic } = parsed;

    const lesson = await prisma.lesson.findUnique({ where: { id }, select: { groupId: true } });
    if (!lesson) return NextResponse.json({ error: 'Dars topilmadi' }, { status: 404 });
    const guard = await checkBranch(auth, lesson.groupId);
    if (guard) return guard;

    // Sana o'zgarsa — boshqa dars bilan to'qnashmasin
    if (scheduledDate) {
      const clash = await prisma.lesson.findFirst({ where: { groupId: lesson.groupId, scheduledDate, id: { not: id } } });
      if (clash) return NextResponse.json({ error: 'Bu sanada boshqa dars bor' }, { status: 409 });
    }

    const data: Record<string, unknown> = {};
    if (scheduledDate !== undefined) data.scheduledDate = scheduledDate;
    if (scheduledTime !== undefined) data.scheduledTime = scheduledTime;
    if (topic !== undefined) data.topic = topic || null;

    const updated = await prisma.lesson.update({ where: { id }, data });
    await logAudit(auth, 'update', 'lesson', id, `Dars tahrirlandi: ${updated.scheduledDate}`);
    return NextResponse.json(updated);
  } catch (error) {
    logger.error('[PATCH /api/admin/lessons]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

// Dars o'chirish (davomat yozuvlari ham o'chadi)
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

    const lesson = await prisma.lesson.findUnique({ where: { id }, select: { groupId: true, scheduledDate: true } });
    if (!lesson) return NextResponse.json({ error: 'Dars topilmadi' }, { status: 404 });
    const guard = await checkBranch(auth, lesson.groupId);
    if (guard) return guard;

    // Cascade yo'q — avval davomatni o'chiramiz
    await prisma.$transaction([
      prisma.attendance.deleteMany({ where: { lessonId: id } }),
      prisma.lesson.delete({ where: { id } }),
    ]);
    await logAudit(auth, 'delete', 'lesson', id, `Dars o'chirildi: ${lesson.scheduledDate}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[DELETE /api/admin/lessons]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
