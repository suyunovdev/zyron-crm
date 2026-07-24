import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { scopedBranchId } from '@/lib/branch-scope';

const CreateParentSchema = z.object({
  login: z.string().min(1).max(64),
  password: z.string().min(4).max(128),
  name: z.string().min(1).max(120),
  phone: z.string().max(32).optional().nullable(),
});

// GET all parents with their children
export async function GET() {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const bId = await scopedBranchId(auth);

  const parents = await prisma.user.findMany({
    where: { role: 'parent', ...(bId ? { branchId: bId } : {}) },
    select: {
      id: true, login: true, name: true, phone: true, status: true, createdAt: true,
      children: {
        select: { id: true, name: true, login: true, phone: true, status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(parents);
}

// POST — create parent
export async function POST(req: NextRequest) {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(req, CreateParentSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { login, password, name, phone } = parsed;

  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing) {
    return NextResponse.json({ error: 'Bu login allaqachon mavjud' }, { status: 409 });
  }

  const bId = await scopedBranchId(auth);

  const user = await prisma.user.create({
    data: {
      login,
      password: bcrypt.hashSync(password, 10),
      rawPass: password,
      name,
      phone: phone || null,
      role: 'parent',
      branchId: bId || null,
    },
  });

  return NextResponse.json({ id: user.id, login: user.login, name: user.name, role: user.role }, { status: 201 });
}

// PATCH — link/unlink children to parent
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const { parentId, studentId, action } = await req.json();

  if (!parentId || !studentId || !action) {
    return NextResponse.json({ error: 'parentId, studentId, action kerak' }, { status: 400 });
  }

  // Filial cheklovi: ota-ona ham, o'quvchi ham shu filialdan bo'lishi shart
  const bId = await scopedBranchId(auth);
  if (bId) {
    const both = await prisma.user.findMany({ where: { id: { in: [parentId, studentId] } }, select: { branchId: true } });
    if (both.length < 2 || both.some(u => u.branchId !== bId)) {
      return NextResponse.json({ error: 'Foydalanuvchi boshqa filialga tegishli' }, { status: 403 });
    }
  }

  if (action === 'link') {
    await prisma.user.update({
      where: { id: studentId },
      data: { parentId },
    });
  } else if (action === 'unlink') {
    await prisma.user.update({
      where: { id: studentId },
      data: { parentId: null },
    });
  } else {
    return NextResponse.json({ error: "action 'link' yoki 'unlink' bo'lishi kerak" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
