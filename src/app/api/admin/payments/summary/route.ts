import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { scopedBranchId } from "@/lib/branch-scope";
import { prisma } from "@/lib/db";
import { computeDebtSummary } from "@/lib/billing";
import { currentMonthTz, todayTz } from "@/lib/date";

// To'lovlar sahifasi statistikasi — BUTUN filial bo'yicha, server-side (limit=500 truncate emas):
//  - totalIncome / todayIncome: shu oy / bugungi tushum
//  - unpaidThisMonth: aktiv o'quvchilar − shu oy to'lov qilganlar ("Bu oy to'lamagan")
//  - debtorCount: balansi manfiy o'quvchilar (dashboard bilan bir xil "Qarzdorlar")
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth("admin");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || currentMonthTz();
    const bId = await scopedBranchId(auth);
    const branchStudent = bId ? { branchId: bId } : {};

    // Shu oy to'lovlari (summa + to'lovchilar)
    const monthPayments = await prisma.payment.findMany({
      where: { month, ...(bId ? { student: { branchId: bId } } : {}) },
      select: { amount: true, studentId: true, createdAt: true },
    });
    const totalIncome = monthPayments.reduce((s, p) => s + p.amount, 0);

    // Bugungi tushum (Tashkent sanasi bo'yicha)
    const today = todayTz();
    const toTashDate = (d: Date) => {
      const x = new Date(new Date(d).toLocaleString("en-US", { timeZone: "Asia/Tashkent" }));
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    };
    const todayIncome = monthPayments
      .filter((p) => toTashDate(p.createdAt) === today)
      .reduce((s, p) => s + p.amount, 0);

    // Bu oy to'lamagan = aktiv o'quvchilar − shu oy to'lov qilgan AKTIV o'quvchilar
    const payerIds = [...new Set(monthPayments.map((p) => p.studentId))];
    const [activeStudents, paidActive, debt] = await Promise.all([
      prisma.user.count({ where: { role: "student", status: "active", ...branchStudent } }),
      payerIds.length
        ? prisma.user.count({ where: { role: "student", status: "active", ...branchStudent, id: { in: payerIds } } })
        : Promise.resolve(0),
      computeDebtSummary(bId), // balans<0 (active+frozen) — dashboard bilan bir xil
    ]);
    const unpaidThisMonth = Math.max(0, activeStudents - paidActive);

    return NextResponse.json({
      totalIncome,
      todayIncome,
      paidThisMonth: paidActive,   // shu oy to'lov qilgan aktiv o'quvchilar soni
      unpaidThisMonth,
      debtorCount: debt.debtorCount,
      activeStudents,
    });
  } catch (error) {
    logger.error("[GET /api/admin/payments/summary]", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
