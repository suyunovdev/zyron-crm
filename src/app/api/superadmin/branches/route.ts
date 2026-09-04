import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;
    const branches = await prisma.branch.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { users: true, groups: true } } },
    });
    return NextResponse.json({ branches });
  } catch (error) {
    logger.error('[GET /api/superadmin/branches]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

const BranchSchema = z.object({
  name: z.string().trim().min(1).max(120).transform(s => s.replace(/\s+/g, ' ')),
  address: z.string().max(200).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  // Filial bilan birga admin yaratish (ixtiyoriy) — bo'lsa atomik yaratiladi
  admin: z.object({
    name: z.string().trim().min(1).max(120).transform(s => s.replace(/\s+/g, ' ')),
    login: z.string().trim().min(1).max(64),
    phone: z.string().max(32).nullable().optional(),
    password: z.string().min(4).max(128),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;
    const parsed = await parseBody(req, BranchSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { name, address, phone, admin } = parsed;

    // Admin login band bo'lmasligini oldindan tekshiramiz (yetim filial bo'lmasin)
    if (admin) {
      const existing = await prisma.user.findUnique({ where: { login: admin.login } });
      if (existing) return NextResponse.json({ error: 'Bu login allaqachon mavjud' }, { status: 409 });
    }

    // Filial + admin bitta tranzaksiyada (biri xato bo'lsa ikkalasi ham bekor)
    const { branch, adminUser } = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({ data: { name, address: address ?? null, phone: phone ?? null } });
      let adminUser: { id: string; login: string } | null = null;
      if (admin) {
        adminUser = await tx.user.create({
          data: {
            login: admin.login,
            password: bcrypt.hashSync(admin.password, 10),
            rawPass: admin.password,
            name: admin.name,
            phone: admin.phone || null,
            role: 'admin',
            status: 'active',
            branchId: branch.id,
          },
          select: { id: true, login: true },
        });
      }
      return { branch, adminUser };
    });

    await logAudit(auth, 'create', 'branch', branch.id,
      `Filial yaratildi: ${branch.name}${adminUser ? ` (admin: ${adminUser.login})` : ''}`);
    if (adminUser) {
      await logAudit(auth, 'create', 'admin', adminUser.id, `Filial admini yaratildi: ${admin!.name} (${adminUser.login}) — ${branch.name}`);
    }

    return NextResponse.json({ ...branch, admin: adminUser ? { login: adminUser.login, password: admin!.password } : null }, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/superadmin/branches]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
