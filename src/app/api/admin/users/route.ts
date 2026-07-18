import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

// Get all users (with optional filters)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;

    const role = req.nextUrl.searchParams.get('role');
    const status = req.nextUrl.searchParams.get('status');

    const where: Record<string, string> = {};
    if (role) where.role = role;
    if (status) where.status = status;

    const isStudent = role === 'student';

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, login: true, name: true, phone: true,
        role: true, subject: true, status: true, level: true, avatar: true, createdAt: true,
        groupStudents: {
          include: {
            group: {
              select: {
                id: true, name: true, subject: true, price: true, lessonsPerMonth: true,
                teacher: { select: { id: true, name: true } },
              },
            },
          },
        },
        teacherGroups: { select: { id: true, name: true, status: true, _count: { select: { students: true } } } },
        ...(isStudent ? {
          payments: { select: { amount: true, month: true } },
          attendances: {
            where: { present: true },
            select: { lesson: { select: { groupId: true } } },
          },
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (isStudent) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const enriched = users.map(u => {
        const payments = (u as Record<string, unknown>).payments as { amount: number; month: string }[] || [];
        const attendances = (u as Record<string, unknown>).attendances as { lesson: { groupId: string } }[] || [];

        const totalPaid = payments.reduce((s: number, p: { amount: number }) => s + p.amount, 0);
        const paidThisMonth = payments
          .filter((p: { month: string }) => p.month === currentMonth)
          .reduce((s: number, p: { amount: number }) => s + p.amount, 0);

        let totalDeducted = 0;
        u.groupStudents.forEach((gs: { group: { id: string; price: number | null; lessonsPerMonth: number | null } }) => {
          const g = gs.group;
          if (!g.price || !g.lessonsPerMonth) return;
          const perLesson = Math.round(g.price / g.lessonsPerMonth);
          const attended = attendances.filter((a: { lesson: { groupId: string } }) => a.lesson.groupId === g.id).length;
          totalDeducted += attended * perLesson;
        });

        const balance = totalPaid - totalDeducted;

        const { payments: _p, attendances: _a, ...rest } = u as Record<string, unknown>;
        return { ...rest, groupStudents: u.groupStudents, _balance: { totalPaid, paidThisMonth, totalDeducted, balance } };
      });

      return NextResponse.json(enriched);
    }

    return NextResponse.json(users);
  } catch (error) {
    console.error("[GET /api/admin/users]", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

// Create user
export async function POST(req: NextRequest) {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const { login, password, name, phone, role, subject, level } = await req.json();

  if (!login || !password || !name || !role) {
    return NextResponse.json({ error: 'login, password, name va role kerak' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing) {
    return NextResponse.json({ error: 'Bu login allaqachon mavjud' }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      login,
      password: bcrypt.hashSync(password, 10),
      rawPass: role === 'student' ? password : null,
      name,
      phone: phone || null,
      role,
      subject: subject || null,
      level: level || null,
    },
  });

  return NextResponse.json({ id: user.id, login: user.login, name: user.name, role: user.role }, { status: 201 });
}

// Update user (status, info)
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const { id, name, phone, subject, status, password } = await req.json();
  if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (subject !== undefined) data.subject = subject;
  if (status !== undefined) data.status = status;
  if (password) data.password = bcrypt.hashSync(password, 10);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, login: true, name: true, role: true, status: true },
  });

  return NextResponse.json(user);
}
