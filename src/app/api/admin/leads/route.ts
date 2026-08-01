import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notify";
import { logger } from '@/lib/logger';
import { getPagination } from '@/lib/paginate';
import { scopedBranchId } from '@/lib/branch-scope';
import { logAudit } from '@/lib/audit';

const VALID_STATUSES = ["new", "contacted", "trial", "enrolled", "rejected"];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth("admin");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    // Filial cheklovi: o'z filiali + filialsiz (landing/webhook orqali kelgan) lidlar.
    // Landing lidlari branchId=null bo'ladi — ular hamma adminга ko'rinsin (kim ham
    // bo'lsa qabul qilib, o'z filialiga o'tkazadi).
    const bId = await scopedBranchId(auth);
    if (bId) where.OR = [{ branchId: bId }, { branchId: null }];

    // Opt-in pagination: ?page/?limit bo'lsa meta qo'shiladi (leads kaliti saqlanadi)
    const pg = getPagination(searchParams);
    if (pg) {
      const [leads, total] = await Promise.all([
        prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, skip: pg.skip, take: pg.take }),
        prisma.lead.count({ where }),
      ]);
      return NextResponse.json({ leads, total, page: pg.page, limit: pg.limit, totalPages: Math.ceil(total / pg.limit) });
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ leads });
  } catch (error) {
    logger.error("[GET /api/admin/leads]", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth("admin");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name, surname, phone, gender, birthDate, guardianPhone, guardianName, guardianType, preferredLang, source, note, prepayment } = body;

  if (!name || !phone) {
    return NextResponse.json(
      { error: "Ism va telefon raqam majburiy" },
      { status: 400 }
    );
  }

  // Filialga biriktirilgan admin — lid avto o'sha filialga
  const bId = await scopedBranchId(auth);

  // Generate short LeadID like "a0084"
  const randomId = Math.random().toString(36).substring(2, 6);
  const prefix = name.charAt(0).toLowerCase();

  const lead = await prisma.lead.create({
    data: {
      leadId: `${prefix}${randomId}`,
      name,
      surname: surname || null,
      phone,
      gender: gender || null,
      birthDate: birthDate || null,
      guardianPhone: guardianPhone || null,
      guardianName: guardianName || null,
      guardianType: guardianType || null,
      preferredLang: preferredLang || null,
      source: source || null,
      note: note || null,
      prepayment: prepayment ? parseInt(prepayment) : null,
      branchId: bId || null,
    },
  });

  await createNotification({
    type: 'lead',
    title: 'Yangi lid qo\'shildi',
    message: `${name} — ${phone}`,
    link: '/dashboard/admin/leads',
    branchId: bId,
  });
  await logAudit(auth, 'create', 'lead', lead.id, `Yangi lid: ${name} (${phone})`);

  return NextResponse.json({ lead }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth("admin");
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { id, status, note } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "ID va status majburiy" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Noto'g'ri status. Ruxsat etilgan: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Filial cheklovi: o'z filiali YOKI filialsiz (landing) lidga ruxsat.
    // Boshqa filial lidiga tegib bo'lmaydi.
    const bId = await scopedBranchId(auth);
    let claimBranch = false;
    if (bId) {
      const existing = await prisma.lead.findUnique({ where: { id }, select: { branchId: true } });
      if (!existing) return NextResponse.json({ error: 'Lid topilmadi' }, { status: 404 });
      if (existing.branchId !== null && existing.branchId !== bId) {
        return NextResponse.json({ error: 'Bu lid boshqa filialga tegishli' }, { status: 403 });
      }
      // Filialsiz (landing) lidni admin qabul qilsa — o'z filialiga biriktiramiz
      if (existing.branchId === null) claimBranch = true;
    }

    const data: Record<string, string> = { status };
    if (note !== undefined) {
      data.note = note;
    }
    if (claimBranch && bId) data.branchId = bId;

    const lead = await prisma.lead.update({
      where: { id },
      data,
    });

    if (status === 'enrolled') {
      await createNotification({
        type: 'enrollment',
        title: 'Lid ro\'yxatdan o\'tdi',
        message: `${lead.name} o'quvchiga aylandi`,
        link: '/dashboard/admin/students',
        branchId: lead.branchId,
      });
    }
    await logAudit(auth, status === 'enrolled' ? 'convert' : 'update', 'lead', id,
      status === 'enrolled' ? `Lid o'quvchiga o'tkazildi: ${lead.name}` : `Lid holati: ${lead.name} → ${status}`);

    return NextResponse.json({ lead });
  } catch (error) {
    logger.error("[PATCH /api/admin/leads]", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth("admin");
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID majburiy" },
        { status: 400 }
      );
    }

    // Filial cheklovi: o'z filiali yoki filialsiz (landing) lidni o'chirsa bo'ladi
    const bId = await scopedBranchId(auth);
    if (bId) {
      const existing = await prisma.lead.findUnique({ where: { id }, select: { branchId: true } });
      if (!existing) return NextResponse.json({ error: 'Lid topilmadi' }, { status: 404 });
      if (existing.branchId !== null && existing.branchId !== bId) {
        return NextResponse.json({ error: 'Bu lid boshqa filialga tegishli' }, { status: 403 });
      }
    }

    await prisma.lead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[DELETE /api/admin/leads]", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
