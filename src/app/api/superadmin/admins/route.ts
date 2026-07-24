import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

// Faqat superadmin: admin va superadmin akkauntlarini boshqarish

export async function GET() {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const [admins, branches] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ['admin', 'superadmin'] } },
        select: {
          id: true, login: true, name: true, phone: true, role: true,
          status: true, rawPass: true, createdAt: true,
          branch: { select: { id: true, name: true } },
        },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' } }),
    ]);

    return NextResponse.json({ admins, branches, currentUserId: auth.id });
  } catch (error) {
    logger.error('[GET /api/superadmin/admins]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

const CreateAdminSchema = z.object({
  login: z.string().min(1).max(64),
  password: z.string().min(4).max(128),
  name: z.string().min(1).max(120),
  phone: z.string().max(32).optional().nullable(),
  role: z.enum(['admin', 'superadmin']),
  branchId: z.string().optional().nullable(), // admin uchun filial (ixtiyoriy)
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const parsed = await parseBody(req, CreateAdminSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { login, password, name, phone, role, branchId } = parsed;

    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) {
      return NextResponse.json({ error: 'Bu login allaqachon mavjud' }, { status: 409 });
    }

    // Filial berilgan bo'lsa mavjudligini tekshiramiz
    let branchName = '';
    if (branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { name: true } });
      if (!branch) return NextResponse.json({ error: 'Filial topilmadi' }, { status: 400 });
      branchName = branch.name;
    }

    const user = await prisma.user.create({
      data: {
        login,
        password: bcrypt.hashSync(password, 10),
        rawPass: password,
        name,
        phone: phone || null,
        role,
        status: 'active',
        branchId: branchId || null,
      },
      select: { id: true, login: true, name: true, role: true, status: true },
    });

    await logAudit(auth, 'create', 'admin', user.id,
      `Yangi ${role} yaratildi: ${name} (${login})${branchName ? ` — ${branchName} filiali` : ''}`);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/superadmin/admins]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
