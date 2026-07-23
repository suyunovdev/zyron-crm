import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { parseBody } from '@/lib/validate';
import { canManageRole } from '@/lib/roles';
import { computeBillable, groupCost } from '@/lib/billing-core';

const CreateUserSchema = z.object({
  login: z.string().min(1).max(64),
  password: z.string().min(4).max(128),
  name: z.string().min(1).max(120),
  role: z.enum(['superadmin', 'admin', 'teacher', 'student', 'parent']),
  phone: z.string().max(32).optional().nullable(),
  subject: z.string().max(80).optional().nullable(),
  level: z.string().max(40).optional().nullable(),
});

// Get all users (with optional filters)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;

    const role = req.nextUrl.searchParams.get('role');
    const status = req.nextUrl.searchParams.get('status');
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const search = req.nextUrl.searchParams.get('search') || '';

    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { login: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const isStudent = role === 'student';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
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
            select: { present: true, lesson: { select: { groupId: true, scheduledDate: true, order: true } } },
            orderBy: [{ lesson: { scheduledDate: 'asc' } }, { lesson: { order: 'asc' } }],
          },
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
    }),
      prisma.user.count({ where }),
    ]);

    const pagination = { page, limit, total, totalPages: Math.ceil(total / limit) };

    if (isStudent) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const enriched = users.map(u => {
        const payments = (u as Record<string, unknown>).payments as { amount: number; month: string }[] || [];
        const attendances = (u as Record<string, unknown>).attendances as
          { present: boolean; lesson: { groupId: string; scheduledDate: string } }[] || [];

        const totalPaid = payments.reduce((s: number, p: { amount: number }) => s + p.amount, 0);
        const paidThisMonth = payments
          .filter((p: { month: string }) => p.month === currentMonth)
          .reduce((s: number, p: { amount: number }) => s + p.amount, 0);

        // Guruh bo'yicha billable (grace qoidasi — billing.ts bilan bir xil), attendances xronologik
        let totalDeducted = 0;
        u.groupStudents.forEach((gs: { group: { id: string; price: number | null; lessonsPerMonth: number | null } }) => {
          const g = gs.group;
          if (!g.price || !g.lessonsPerMonth) return;
          const recs = attendances
            .filter(a => a.lesson.groupId === g.id)
            .map(a => ({ scheduledDate: a.lesson.scheduledDate, present: a.present }));
          const { billableCount } = computeBillable(recs);
          totalDeducted += groupCost(billableCount, g.price, g.lessonsPerMonth);
        });

        const balance = totalPaid - totalDeducted;

        const { payments: _p, attendances: _a, ...rest } = u as Record<string, unknown>;
        return { ...rest, groupStudents: u.groupStudents, _balance: { totalPaid, paidThisMonth, totalDeducted, balance } };
      });

      return NextResponse.json({ data: enriched, pagination });
    }

    return NextResponse.json({ data: users, pagination });
  } catch (error) {
    logger.error("[GET /api/admin/users]", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

// Create user
export async function POST(req: NextRequest) {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(req, CreateUserSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { login, password, name, phone, role, subject, level } = parsed;

  // Rol darajasidagi ruxsat: faqat superadmin admin/superadmin yarata oladi
  if (!canManageRole(auth.role, role)) {
    return NextResponse.json({ error: 'Bu rolda foydalanuvchi yaratishga ruxsatingiz yo\'q' }, { status: 403 });
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

  // Nishon foydalanuvchi admin/superadmin bo'lsa — faqat superadmin tahrirlaydi
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
  if (!canManageRole(auth.role, target.role)) {
    return NextResponse.json({ error: 'Bu foydalanuvchini tahrirlashga ruxsatingiz yo\'q' }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (subject !== undefined) data.subject = subject;
  if (status !== undefined) data.status = status;
  if (password) {
    data.password = bcrypt.hashSync(password, 10);
    data.rawPass = password;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, login: true, name: true, role: true, status: true },
  });

  return NextResponse.json(user);
}
