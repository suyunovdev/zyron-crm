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
import { pushToParent } from '@/lib/tg-notify';
import { escapeHtml } from '@/lib/telegram';
import { computeStudentBalance } from '@/lib/billing';

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

// Tahrirlash — har bir maydon ixtiyoriy, LEKIN `reason` (audit izohi) MAJBURIY.
const EditPaymentSchema = z.object({
  id: z.string().min(1),
  amount: z.coerce.number().int().refine(v => v !== 0, 'summa 0 bo\'lmasin').optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'oy formati YYYY-MM').optional(),
  method: z.enum(['cash', 'card', 'transfer']).optional(),
  note: z.string().max(500).optional().nullable(),
  reason: z.string().trim().min(3, 'O\'zgartirish sababi (izoh) majburiy — kamida 3 belgi'),
});

// O'chirish — `reason` (audit izohi) MAJBURIY.
const DeletePaymentSchema = z.object({
  id: z.string().min(1),
  reason: z.string().trim().min(3, 'O\'chirish sababi (izoh) majburiy — kamida 3 belgi'),
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

  // Ishorani type'dan hosil qilamiz: refund → manfiy (balansni kamaytiradi),
  // to'lov/chegirma → musbat. Operator ishorasidan qat'i nazar to'g'ri bo'ladi.
  const signedAmount = payType === 'refund' ? -Math.abs(Number(amount)) : Math.abs(Number(amount));

  // Idempotentlik: so'nggi 15s da bir xil (o'quvchi, summa, oy, tur) to'lov bo'lsa —
  // takror (ikki marta bosish / tarmoq qayta urinishi) deb rad etamiz.
  const dup = await prisma.payment.findFirst({
    where: { studentId, amount: signedAmount, month, type: payType, createdAt: { gte: new Date(Date.now() - 15_000) } },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json({ error: 'Bu to\'lov allaqachon kiritildi (takror)' }, { status: 409 });
  }

  // DB-darajali idempotentlik (findFirst→create TOCTOU'ni yopadi): 15s buketli unique kalit.
  const bucket = Math.floor(Date.now() / 15_000);
  const dedupeKey = `${studentId}:${signedAmount}:${month}:${payType}:${bucket}`;

  let payment;
  try {
    payment = await prisma.payment.create({
      data: {
        studentId,
        amount: signedAmount,
        month,
        method: method || "cash",
        type: payType,
        note: note || null,
        dedupeKey,
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
  } catch (e) {
    // Unique buzilishi (P2002) = parallel takror so'rov — atomik rad
    if (e && typeof e === 'object' && (e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Bu to\'lov allaqachon kiritildi (takror)' }, { status: 409 });
    }
    logger.error('[POST /api/admin/payments]', e);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }

  const methodLabel = method === 'card' ? 'Karta' : method === 'transfer' ? "O'tkazma" : 'Naqd';
  const typeLabel = payType === 'refund' ? 'Qaytarish' : payType === 'discount' ? 'Chegirma' : 'To\'lov';
  // Bildirishnoma xatosi asosiy to'lovni buzmasin (yon effekt)
  await createNotification({
    type: 'payment',
    title: `Yangi ${typeLabel.toLowerCase()} qabul qilindi`,
    message: `${payment.student.name} — ${signedAmount.toLocaleString()} so'm (${methodLabel})`,
    link: '/dashboard/admin/payments',
    branchId: student.branchId,
  }).catch(() => {});

  // Avto-push: ota-onaga Telegram xabar — faqat haqiqiy to'lovda (refund/chegirma emas)
  if (payType === 'payment') {
    void (async () => {
      const bal = await computeStudentBalance(studentId).catch(() => null);
      let balLine = '';
      if (bal) {
        balLine = bal.balance < 0
          ? `\nBalans: −${Math.abs(bal.balance).toLocaleString('ru-RU')} so'm (qarzdorlik)`
          : `\nBalans: +${bal.balance.toLocaleString('ru-RU')} so'm`;
      }
      await pushToParent(
        studentId,
        `💰 <b>${escapeHtml(payment.student.name)}</b> uchun ${Math.abs(signedAmount).toLocaleString('ru-RU')} so'm to'lov qabul qilindi (${methodLabel}).${balLine}`,
      );
    })();
  }

  return NextResponse.json(payment, { status: 201 });
}

// To'lovni o'chirish — faqat superadmin (moliyaviy nazorat)
// To'lovni tahrirlash — majburiy izoh (reason) + auditga aniq yoziladi (nima o'zgardi + sabab).
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth("admin");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(req, EditPaymentSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { id, amount, month, method, note, reason } = parsed;

  const existing = await prisma.payment.findUnique({
    where: { id },
    include: { student: { select: { name: true, branchId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "To'lov topilmadi" }, { status: 404 });

  // Filial cheklovi: admin faqat o'z filiali o'quvchisining to'lovini tahrirlaydi
  const bId = await scopedBranchId(auth);
  if (bId && existing.student.branchId !== bId) {
    return NextResponse.json({ error: "Bu to'lov boshqa filialga tegishli" }, { status: 403 });
  }

  const methodLabels: Record<string, string> = { cash: 'Naqd', card: 'Karta', transfer: "O'tkazma" };
  const data: Record<string, unknown> = {};
  const changes: string[] = [];
  if (amount !== undefined) {
    // Ishora turdan (mavjud type) kelib chiqadi: refund → manfiy, aks holda musbat
    const signed = existing.type === 'refund' ? -Math.abs(amount) : Math.abs(amount);
    if (signed !== existing.amount) {
      data.amount = signed;
      changes.push(`summa: ${existing.amount.toLocaleString()} → ${signed.toLocaleString()} so'm`);
    }
  }
  if (month !== undefined && month !== existing.month) {
    data.month = month;
    changes.push(`oy: ${existing.month} → ${month}`);
  }
  if (method !== undefined && method !== existing.method) {
    data.method = method;
    changes.push(`usul: ${methodLabels[existing.method] || existing.method} → ${methodLabels[method] || method}`);
  }
  if (note !== undefined && (note || null) !== (existing.note || null)) {
    data.note = note || null;
    changes.push(`izoh: "${existing.note || '—'}" → "${note || '—'}"`);
  }

  if (changes.length === 0) {
    return NextResponse.json({ error: "Hech qanday o'zgarish kiritilmadi" }, { status: 400 });
  }

  await prisma.payment.update({ where: { id }, data });
  await logAudit(auth, 'update', 'payment', id,
    `To'lov tahrirlandi: ${existing.student.name} — ${changes.join('; ')}. Sabab: ${reason}`);

  return NextResponse.json({ success: true });
}

// To'lovni o'chirish — majburiy izoh (reason) + auditga aniq yoziladi.
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth("admin");
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(req, DeletePaymentSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { id, reason } = parsed;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { student: { select: { name: true, branchId: true } } },
  });
  if (!payment) return NextResponse.json({ error: "To'lov topilmadi" }, { status: 404 });

  // Filial cheklovi: admin faqat o'z filiali o'quvchisining to'lovini o'chiradi
  const bId = await scopedBranchId(auth);
  if (bId && payment.student.branchId !== bId) {
    return NextResponse.json({ error: "Bu to'lov boshqa filialga tegishli" }, { status: 403 });
  }

  await prisma.payment.delete({ where: { id } });
  await logAudit(auth, 'delete', 'payment', id,
    `To'lov o'chirildi: ${payment.student.name} — ${payment.amount.toLocaleString()} so'm (${payment.month}, ${payment.type}). Sabab: ${reason}`);

  return NextResponse.json({ success: true });
}
