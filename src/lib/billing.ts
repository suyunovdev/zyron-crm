import { prisma } from '@/lib/db';
import { billableCost, computeBillableRecords, perLessonRate } from '@/lib/billing-core';

/**
 * Yagona hisob-kitob (billing) manbasi.
 *
 * Model: "joy band" (reserved seat) — o'quvchi kelgan yoki sababsiz ketma-ket <=3
 * yo'qlik qilgan har bir dars uchun (narx ÷ oyiga darslar) hisoblanadi (billing-core).
 * Balans = jami to'langan − jami hisoblangan (running ledger, butun davr).
 *
 * MUHIM: student/balance, admin/stats, admin o'quvchilar ro'yxati/detali va
 * parent/children AYNAN shu sof yadrodan (billing-core) foydalanadi — hamma joyda
 * bir xil balans.
 */

// Sof yadroni re-export qilamiz (eski `from '@/lib/billing'` importlari ishlashi uchun)
export { perLessonRate, computeBillable, groupCost, ABSENCE_GRACE } from '@/lib/billing-core';

export interface GroupBalance {
  groupId: string;
  groupName: string;
  price: number;
  lessonsPerMonth: number;
  attendedLessons: number;
  cost: number;
}

export interface StudentBalance {
  balance: number;
  totalPaid: number;
  totalCost: number;
  groups: GroupBalance[];
}

/** Bitta o'quvchining balansini hisoblaydi (student/balance uchun). */
export async function computeStudentBalance(studentId: string): Promise<StudentBalance> {
  const groupStudents = await prisma.groupStudent.findMany({
    where: { studentId },
    include: {
      group: { select: { id: true, name: true, price: true, lessonsPerMonth: true } },
    },
  });

  let totalCost = 0;
  const groups: GroupBalance[] = [];

  for (const gs of groupStudents) {
    const { group } = gs;

    // Xronologik davomat yozuvlari (present + yo'qlik) — grace qoidasi uchun
    const records = await prisma.attendance.findMany({
      where: { studentId, lesson: { groupId: group.id } },
      select: { present: true, lesson: { select: { scheduledDate: true, order: true, perLessonRate: true } } },
      orderBy: [{ lesson: { scheduledDate: 'asc' } }, { lesson: { order: 'asc' } }],
    });
    // K-2: har dars o'z muzlatilgan narxidan hisoblanadi; snapshot yo'q (eski dars) bo'lsa joriy narx zaxira.
    const fallbackRate = perLessonRate(group.price, group.lessonsPerMonth);
    const recs = records.map(r => ({
      scheduledDate: r.lesson.scheduledDate,
      present: r.present,
      rate: r.lesson.perLessonRate ?? fallbackRate,
    }));
    const billableCount = computeBillableRecords(recs).billable.length;

    const cost = billableCost(recs);
    totalCost += cost;

    groups.push({
      groupId: group.id,
      groupName: group.name,
      price: group.price,
      lessonsPerMonth: group.lessonsPerMonth,
      attendedLessons: billableCount,
      cost,
    });
  }

  const paid = await prisma.payment.aggregate({
    where: { studentId },
    _sum: { amount: true },
  });
  const totalPaid = paid._sum.amount || 0;

  return { balance: totalPaid - totalCost, totalPaid, totalCost, groups };
}

export interface DebtSummary {
  /** Manfiy balansli o'quvchilar soni (qarzdorlar). */
  debtorCount: number;
  /** Barcha qarzdorlarning qarz summasi (musbat son). */
  totalDebt: number;
  /** studentId → balance (barcha faol o'quvchilar). */
  balances: Map<string, number>;
}

/**
 * Barcha FAOL o'quvchilarning qarzdorligini bitta agregatsiyada hisoblaydi
 * (admin/stats uchun). computeStudentBalance bilan bir xil formula — 3 ta so'rov.
 */
export async function computeDebtSummary(branchId?: string | null): Promise<DebtSummary> {
  // Frozen o'quvchilar ham hisobga olinadi (avto-muzlatilgan qarzi yo'qolmasin); archived emas.
  const activeStatuses = ['active', 'frozen'];
  // Filial cheklovi (bo'sh bo'lsa — barcha filiallar)
  const studentWhere = { role: 'student', status: { in: activeStatuses }, ...(branchId ? { branchId } : {}) };

  // 1) O'quvchi → guruh (narx/dars soni)
  const memberships = await prisma.groupStudent.findMany({
    where: { student: studentWhere },
    select: {
      studentId: true,
      group: { select: { id: true, price: true, lessonsPerMonth: true } },
    },
  });
  // K-2 zaxira narxi: snapshot yo'q darslar uchun guruhning joriy dars narxi.
  const fallbackRateByGroup = new Map<string, number>();
  for (const m of memberships) {
    fallbackRateByGroup.set(m.group.id, perLessonRate(m.group.price, m.group.lessonsPerMonth));
  }

  // 2) Barcha davomat yozuvlari (present + yo'qlik), xronologik — grace qoidasi uchun
  const rows = await prisma.attendance.findMany({
    where: { student: studentWhere },
    select: { studentId: true, present: true, lesson: { select: { groupId: true, scheduledDate: true, order: true, perLessonRate: true } } },
    orderBy: [{ lesson: { scheduledDate: 'asc' } }, { lesson: { order: 'asc' } }],
  });
  // (studentId, groupId) bo'yicha guruhlash — global tartib har subsekvensiyani xronologik saqlaydi.
  // Har yozuv o'z muzlatilgan narxini (rate) olib yuradi (K-2).
  const recordsByKey = new Map<string, { scheduledDate: string; present: boolean; rate: number }[]>();
  for (const r of rows) {
    const gid = r.lesson.groupId;
    const key = `${r.studentId}:${gid}`;
    (recordsByKey.get(key) ?? recordsByKey.set(key, []).get(key)!).push({
      scheduledDate: r.lesson.scheduledDate,
      present: r.present,
      rate: r.lesson.perLessonRate ?? fallbackRateByGroup.get(gid) ?? 0,
    });
  }
  // Har (o'quvchi, guruh) uchun snapshot narxidan cost
  const costByKey = new Map<string, number>();
  for (const [key, recs] of recordsByKey) {
    costByKey.set(key, billableCost(recs));
  }

  // 3) To'lovlar: studentId bo'yicha yig'indi (filial cheklovi bilan)
  const paymentSums = await prisma.payment.groupBy({
    by: ['studentId'],
    where: branchId ? { student: { branchId } } : {},
    _sum: { amount: true },
  });
  const paidByStudent = new Map<string, number>();
  for (const p of paymentSums) paidByStudent.set(p.studentId, p._sum.amount || 0);

  // Har bir o'quvchining costini yig'ish (guruh bo'yicha yaxlitlab — student/balance bilan bir xil)
  const costByStudent = new Map<string, number>();
  const studentIds = new Set<string>();
  for (const m of memberships) {
    studentIds.add(m.studentId);
    const cost = costByKey.get(`${m.studentId}:${m.group.id}`) || 0;
    costByStudent.set(m.studentId, (costByStudent.get(m.studentId) || 0) + cost);
  }
  // To'lov qilgan, lekin guruhsiz o'quvchilar ham hisobga olinsin (balans musbat bo'ladi)
  for (const sid of paidByStudent.keys()) studentIds.add(sid);

  const balances = new Map<string, number>();
  let debtorCount = 0;
  let totalDebt = 0;
  for (const sid of studentIds) {
    const balance = (paidByStudent.get(sid) || 0) - (costByStudent.get(sid) || 0);
    balances.set(sid, balance);
    if (balance < 0) {
      debtorCount++;
      totalDebt += -balance;
    }
  }

  return { debtorCount, totalDebt, balances };
}
