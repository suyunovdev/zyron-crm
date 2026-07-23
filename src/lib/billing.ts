import { prisma } from '@/lib/db';

/**
 * Yagona hisob-kitob (billing) manbasi.
 *
 * Model: "per-lesson" — o'quvchi qatnashgan har bir dars uchun
 * (guruhning oylik narxi ÷ oyiga darslar soni) miqdorida hisoblanadi.
 * Balans = jami to'langan − jami hisoblangan (running ledger, butun davr).
 *
 * MUHIM: student/balance va admin/stats AYNAN shu funksiyalardan foydalanadi,
 * shunda o'quvchi va admin bir xil raqamni ko'radi (nomuvofiqlik bo'lmaydi).
 */

/** Bitta dars narxi (so'mda). lessonsPerMonth <= 0 bo'lsa 0. */
export function perLessonRate(price: number, lessonsPerMonth: number): number {
  return lessonsPerMonth > 0 ? price / lessonsPerMonth : 0;
}

/** Sababsiz ketma-ket yo'qlik uchun "grace" chegarasi (shu songacha hisoblanadi). */
export const ABSENCE_GRACE = 3;

/**
 * "Joy band" (reserved seat) modeli — qaysi darslar hisoblanadigan (billable):
 *  - present → hisoblanadi, ketma-ketlik nolga tushadi;
 *  - yo'qlik (present=false) → ketma-ketlik +1; agar <= ABSENCE_GRACE bo'lsa hisoblanadi,
 *    aks holda hisoblanmaydi.
 * records XRONOLOGIK tartibda (lesson scheduledDate, keyin order) berilishi shart.
 * currentAbsenceStreak > ABSENCE_GRACE → o'quvchi hozir "tushib qolgan" (avto-muzlatish sharti).
 */
export function computeBillable(
  records: { scheduledDate: string; present: boolean }[],
): { billableDates: string[]; billableCount: number; currentAbsenceStreak: number } {
  let streak = 0;
  const billableDates: string[] = [];
  for (const r of records) {
    if (r.present) {
      streak = 0;
      billableDates.push(r.scheduledDate);
    } else {
      streak++;
      if (streak <= ABSENCE_GRACE) billableDates.push(r.scheduledDate);
    }
  }
  return { billableDates, billableCount: billableDates.length, currentAbsenceStreak: streak };
}

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
    const rate = perLessonRate(group.price, group.lessonsPerMonth);

    // Xronologik davomat yozuvlari (present + yo'qlik) — grace qoidasi uchun
    const records = await prisma.attendance.findMany({
      where: { studentId, lesson: { groupId: group.id } },
      select: { present: true, lesson: { select: { scheduledDate: true, order: true } } },
      orderBy: [{ lesson: { scheduledDate: 'asc' } }, { lesson: { order: 'asc' } }],
    });
    const { billableCount } = computeBillable(
      records.map(r => ({ scheduledDate: r.lesson.scheduledDate, present: r.present })),
    );

    const cost = Math.round(billableCount * rate);
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
export async function computeDebtSummary(): Promise<DebtSummary> {
  // Frozen o'quvchilar ham hisobga olinadi (avto-muzlatilgan qarzi yo'qolmasin); archived emas.
  const activeStatuses = ['active', 'frozen'];

  // 1) O'quvchi → guruh (narx/dars soni)
  const memberships = await prisma.groupStudent.findMany({
    where: { student: { role: 'student', status: { in: activeStatuses } } },
    select: {
      studentId: true,
      group: { select: { id: true, price: true, lessonsPerMonth: true } },
    },
  });

  // 2) Barcha davomat yozuvlari (present + yo'qlik), xronologik — grace qoidasi uchun
  const rows = await prisma.attendance.findMany({
    where: { student: { role: 'student', status: { in: activeStatuses } } },
    select: { studentId: true, present: true, lesson: { select: { groupId: true, scheduledDate: true, order: true } } },
    orderBy: [{ lesson: { scheduledDate: 'asc' } }, { lesson: { order: 'asc' } }],
  });
  // (studentId, groupId) bo'yicha guruhlash — global tartib har subsekvensiyani xronologik saqlaydi
  const recordsByKey = new Map<string, { scheduledDate: string; present: boolean }[]>();
  for (const r of rows) {
    const key = `${r.studentId}:${r.lesson.groupId}`;
    (recordsByKey.get(key) ?? recordsByKey.set(key, []).get(key)!).push({
      scheduledDate: r.lesson.scheduledDate, present: r.present,
    });
  }
  const attendedByStudentGroup = new Map<string, number>();
  for (const [key, recs] of recordsByKey) {
    attendedByStudentGroup.set(key, computeBillable(recs).billableCount);
  }

  // 3) To'lovlar: studentId bo'yicha yig'indi
  const paymentSums = await prisma.payment.groupBy({
    by: ['studentId'],
    _sum: { amount: true },
  });
  const paidByStudent = new Map<string, number>();
  for (const p of paymentSums) paidByStudent.set(p.studentId, p._sum.amount || 0);

  // Har bir o'quvchining costini yig'ish (guruh bo'yicha yaxlitlab — student/balance bilan bir xil)
  const costByStudent = new Map<string, number>();
  const studentIds = new Set<string>();
  for (const m of memberships) {
    studentIds.add(m.studentId);
    const rate = perLessonRate(m.group.price, m.group.lessonsPerMonth);
    const attended = attendedByStudentGroup.get(`${m.studentId}:${m.group.id}`) || 0;
    const cost = Math.round(attended * rate);
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
