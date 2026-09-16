import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { scopedBranchId } from "@/lib/branch-scope";
import { computeDebtSummary } from "@/lib/billing";

// O'quvchilar sahifasi footer statistikasi — BUTUN filial bo'yicha (limit=500 client
// truncate emas). To'lagan/Qarzdor/Yangi/Jami — balansga asoslangan, mutually-exclusive.
export async function GET(_req: NextRequest) {
  try {
    const auth = await requireAuth("admin");
    if (auth instanceof NextResponse) return auth;

    const bId = await scopedBranchId(auth);
    // Ro'yxat scope'iga mos: faqat AKTIV o'quvchilar
    const s = await computeDebtSummary(bId, ["active"]);

    return NextResponse.json({
      total: s.total,
      paid: s.paidCount,
      debtor: s.debtorCount,
      new: s.newCount,
    });
  } catch (error) {
    logger.error("[GET /api/admin/students/summary]", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
