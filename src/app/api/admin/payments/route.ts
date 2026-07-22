import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notify";
import { logger } from '@/lib/logger';
import { getPagination, paginated } from '@/lib/paginate';

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

export async function POST(req: NextRequest) {
  const auth = await requireAuth("admin");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { studentId, amount, month, method, note } = body;

  if (!studentId || !amount || !month) {
    return NextResponse.json(
      { error: "studentId, amount va month majburiy" },
      { status: 400 }
    );
  }

  const payment = await prisma.payment.create({
    data: {
      studentId,
      amount: Number(amount),
      month,
      method: method || "cash",
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
  });

  return NextResponse.json(payment, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth("admin");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json(
      { error: "id majburiy" },
      { status: 400 }
    );
  }

  await prisma.payment.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
