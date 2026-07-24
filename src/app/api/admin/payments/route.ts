import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-utils";
import { parseBody } from "@/lib/validate";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notify";
import { logger } from '@/lib/logger';
import { getPagination, paginated } from '@/lib/paginate';
import { logAudit } from '@/lib/audit';
import { scopedBranchId } from '@/lib/branch-scope';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth("admin");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const studentId = searchParams.get("studentId");

    const where: Record<string, unknown> = {};

    if (month) {
      where.month = month;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    // Filial cheklovi: faqat o'z filiali o'quvchilarining to'lovlari
    const bId = await scopedBranchId(auth);
    if (bId) where.student = { branchId: bId };

    const include = {
      student: { select: { id: true, name: true, login: true } },
    };
    const orderBy = { createdAt: "desc" as const };

    // Opt-in pagination: ?page/?limit bo'lsa konvert, bo'lmasa to'liq massiv
    const pg = getPagination(searchParams);
    if (pg) {
      const [data, total] = await Promise.all([
        prisma.payment.findMany({ where, include, orderBy, skip: pg.skip, take: pg.take }),
        prisma.payment.count({ where }),
      ]);
      return NextResponse.json(paginated(data, total, pg));
    }

    const payments = await prisma.payment.findMany({ where, include, orderBy });
    return NextResponse.json(payments);
  } catch (error) {
    logger.error("[GET /api/admin/payments]", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

const PaymentSchema = z.object({
  studentId: z.string().min(1),
  amount: z.coerce.number().int().refine(v => v !== 0, 'summa 0 bo\'lmasin'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'oy formati YYYY-MM'),
  method: z.enum(['cash', 'card', 'transfer']).optional(),
  note: z.string().max(500).optional().nullable(),
  type: z.enum(['payment', 'refund', 'discount']).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth("admin");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(req, PaymentSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { studentId, amount, month, method, note, type } = parsed;

  // refund/discount — faqat superadmin (moliyaviy nazorat)
  const payType = ['payment', 'refund', 'discount'].includes(type || '') ? type : 'payment';
  if (payType !== 'payment' && auth.role !== 'superadmin') {
    return NextResponse.json({ error: 'Refund/chegirma faqat superadmin tomonidan' }, { status: 403 });
  }

  // Filial cheklovi: o'quvchi shu filialdan bo'lishi shart
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { branchId: true } });
  if (!student) return NextResponse.json({ error: 'O\'quvchi topilmadi' }, { status: 404 });
  const bId = await scopedBranchId(auth);
  if (bId && student.branchId !== bId) {
    return NextResponse.json({ error: 'O\'quvchi boshqa filialga tegishli' }, { status: 403 });
  }

  const payment = await prisma.payment.create({
    data: {
      studentId,
      amount: Number(amount),
      month,
      method: method || "cash",
      type: payType,
      note: note || null,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          login: true,
        },
      },
    },
  });

  const methodLabel = method === 'card' ? 'Karta' : method === 'transfer' ? "O'tkazma" : 'Naqd';
  await createNotification({
    type: 'payment',
    title: 'Yangi to\'lov qabul qilindi',
    message: `${payment.student.name} — ${Number(amount).toLocaleString()} so'm (${methodLabel})`,
    link: '/dashboard/admin/payments',
    branchId: student.branchId,
  });

  return NextResponse.json(payment, { status: 201 });
}

// To'lovni o'chirish — faqat superadmin (moliyaviy nazorat)
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth("superadmin");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json(
      { error: "id majburiy" },
      { status: 400 }
    );
  }

  const payment = await prisma.payment.findUnique({ where: { id }, include: { student: { select: { name: true } } } });
  await prisma.payment.delete({ where: { id } });
  await logAudit(auth, 'delete', 'payment', id,
    `To'lov o'chirildi: ${payment?.student.name || '?'} — ${payment?.amount?.toLocaleString() || 0} so'm`);

  return NextResponse.json({ success: true });
}
