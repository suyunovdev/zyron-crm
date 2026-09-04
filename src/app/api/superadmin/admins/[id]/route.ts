import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { isAdminRole } from '@/lib/roles';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

// Faol superadminlar soni (oxirgisini himoya qilish uchun)
async function activeSuperadminCount(): Promise<number> {
  return prisma.user.count({ where: { role: 'superadmin', status: 'active' } });
}

const UpdateAdminSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  login: z.string().trim().min(1).max(64).optional(),
  phone: z.string().max(32).nullable().optional(),
  status: z.enum(['active', 'frozen', 'archived']).optional(),
  password: z.string().min(4).max(128).optional(),
  role: z.enum(['admin', 'superadmin']).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const parsed = await parseBody(req, UpdateAdminSchema);
    if (parsed instanceof NextResponse) return parsed;
    const { name, login, phone, status, password, role } = parsed;

    // Login o'zgartirilsa — unikallik tekshiruvi
    if (login) {
      const existing = await prisma.user.findUnique({ where: { login }, select: { id: true } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Bu login allaqachon mavjud' }, { status: 409 });
      }
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });
    if (!target || !isAdminRole(target.role)) {
      return NextResponse.json({ error: 'Admin topilmadi' }, { status: 404 });
    }

    const demoting = role !== undefined && role !== 'superadmin' && target.role === 'superadmin';
    const deactivating = status !== undefined && status !== 'active';

    // O'zini bloklash/tushirishning oldini olish (lockout himoyasi)
    if (id === auth.id && (demoting || deactivating)) {
      return NextResponse.json({ error: 'O\'zingizni bloklab yoki tushirib bo\'lmaydi' }, { status: 400 });
    }

    // Oxirgi faol superadminni himoya qilish
    if (target.role === 'superadmin' && (demoting || deactivating) && (await activeSuperadminCount()) <= 1) {
      return NextResponse.json({ error: 'Oxirgi superadminni o\'zgartirib bo\'lmaydi' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (login !== undefined) data.login = login;
    if (phone !== undefined) data.phone = phone;
    if (status !== undefined) data.status = status;
    if (role !== undefined) data.role = role;
    if (password) {
      data.password = bcrypt.hashSync(password, 10);
      data.rawPass = password;
    }
    // Sessiya intizomi (F2-1): rol yoki parol o'zgarsa foydalanuvchining barcha
    // eski tokenlari bekor qilinsin (majburiy logout) — pasaytirilgan admin eski
    // JWT bilan admin huquqini saqlab qolmasin.
    if (role !== undefined || password) {
      data.tokenVersion = { increment: 1 };
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, login: true, name: true, role: true, status: true },
    });
    const changes = [
      role && `rol→${role}`, status && `holat→${status}`, password && 'parol tiklandi',
      login && 'login o\'zgartirildi', name && 'ism',
    ].filter(Boolean).join(', ');
    await logAudit(auth, 'update', 'admin', id, `${user.name}: ${changes}`);
    return NextResponse.json(user);
  } catch (error) {
    logger.error('[PATCH /api/superadmin/admins/[id]]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth('superadmin');
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (id === auth.id) {
      return NextResponse.json({ error: 'O\'zingizni o\'chira olmaysiz' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target || !isAdminRole(target.role)) {
      return NextResponse.json({ error: 'Admin topilmadi' }, { status: 404 });
    }
    if (target.role === 'superadmin' && (await activeSuperadminCount()) <= 1) {
      return NextResponse.json({ error: 'Oxirgi superadminni o\'chirib bo\'lmaydi' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    await logAudit(auth, 'delete', 'admin', id, `Admin o'chirildi (${target.role})`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[DELETE /api/superadmin/admins/[id]]', error);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
