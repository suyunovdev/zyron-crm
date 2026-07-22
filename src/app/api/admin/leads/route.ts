import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notify";
import { logger } from '@/lib/logger';

const VALID_STATUSES = ["new", "contacted", "trial", "enrolled", "rejected"];

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth("admin");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: Record<string, string> = {};
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
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
    },
  });

  await createNotification({
    type: 'lead',
    title: 'Yangi lid qo\'shildi',
    message: `${name} — ${phone}`,
    link: '/dashboard/admin/leads',
  });

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

    const data: Record<string, string> = { status };
    if (note !== undefined) {
      data.note = note;
    }

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
      });
    }

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

    await prisma.lead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[DELETE /api/admin/leads]", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
