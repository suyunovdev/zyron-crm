/**
 * Billing yadro — SOF funksiyalar (prisma'siz).
 * Ham server (billing.ts, payroll.ts), ham client (admin detal sahifasi) shu
 * yagona mantiqdan foydalanadi — balans hamma joyda bir xil bo'lishi uchun.
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

/**
 * O'quvchining bitta guruhdagi to'lanadigan (billable) darslari sonidan cost hisoblaydi.
 * billing.ts va admin/parent hammasi shu formuladan foydalanadi.
 */
export function groupCost(billableCount: number, price: number, lessonsPerMonth: number): number {
  return Math.round(billableCount * perLessonRate(price, lessonsPerMonth));
}
