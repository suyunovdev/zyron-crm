import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

// GET all parents with their children
export async function GET() {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const parents = await prisma.user.findMany({
    where: { role: 'parent' },
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

  const { login, password, name, phone } = await req.json();

  if (!login || !password || !name) {
    return NextResponse.json({ error: 'login, password, name kerak' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing) {
    return NextResponse.json({ error: 'Bu login allaqachon mavjud' }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      login,
      password: bcrypt.hashSync(password, 10),
      rawPass: password,
      name,
      phone: phone || null,
      role: 'parent',
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
