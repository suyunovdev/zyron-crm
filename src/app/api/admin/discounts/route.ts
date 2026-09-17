import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { scopedBranchId } from "@/lib/branch-scope";
import { prisma } from "@/lib/db";
import { perLessonRate, discountedRate } from "@/lib/billing-core";

// Chegirma berilgan a'zoliklar ro'yxati (dashboard kartasi + batafsil sahifa uchun).
// Filial-scoped. Har yozuv: o'quvchi, guruh, ustoz, chegirma, kurs narxi, effektiv narx.
export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAuth("admin");
    if (auth instanceof NextResponse) return auth;

    const bId = await scopedBranchId(auth);

    const rows = await prisma.groupStudent.findMany({
      where: {
        OR: [{ discountPercent: { gt: 0 } }, { discountAmount: { gt: 0 } }],
        ...(bId ? { group: { branchId: bId } } : {}),
      },
      select: {
        discountPercent: true,
        discountAmount: true,
        student: { select: { id: true, name: true, phone: true } },
        group: {
          select: { id: true, name: true, price: true, lessonsPerMonth: true, teacher: { select: { name: true } } },
        },
      },
    });

    const items = rows.map((r) => {
      const price = r.group.price || 0;
      const lpm = r.group.lessonsPerMonth || 0;
      // Effektiv oylik narx: chegirmali dars narxi × oyiga darslar (student detali bilan bir xil formula)
      const effRate = discountedRate(perLessonRate(price, lpm), {
        percent: r.discountPercent, amount: r.discountAmount, lessonsPerMonth: lpm,
      });
      const effectivePrice = Math.round(effRate * lpm);
      return {
        studentId: r.student.id,
        studentName: r.student.name,
        phone: r.student.phone,
        groupId: r.group.id,
        groupName: r.group.name,
        teacherName: r.group.teacher?.name || "—",
        discountPercent: r.discountPercent,
        discountAmount: r.discountAmount,
        price,
        effectivePrice,
      };
    });

    items.sort((a, b) => a.studentName.localeCompare(b.studentName, "uz"));

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    logger.error("[GET /api/admin/discounts]", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
