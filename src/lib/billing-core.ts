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
 * "Joy band" (reserved seat) modelining YAGONA state-machine'i — qaysi yozuvlar
 * hisoblanadigan (billable) ekanini aniqlaydi va o'sha yozuvlarni QAYTARADI (generic):
 *  - present → hisoblanadi, ketma-ketlik nolga tushadi;
 *  - yo'qlik (present=false) → ketma-ketlik +1; agar <= ABSENCE_GRACE bo'lsa hisoblanadi,
 *    aks holda hisoblanmaydi.
 * records XRONOLOGIK tartibda (lesson scheduledDate, keyin order) berilishi shart.
 * Generic bo'lgani uchun yozuvdagi qo'shimcha maydonlar (masalan `rate`) saqlanadi —
 * billing/payroll shu bir manbadan foydalanadi (K-2 narx snapshot uchun ham).
 */
export function computeBillableRecords<T extends { scheduledDate: string; present: boolean }>(
  records: T[],
): { billable: T[]; currentAbsenceStreak: number } {
  let streak = 0;
  const billable: T[] = [];
  for (const r of records) {
    if (r.present) {
      streak = 0;
      billable.push(r);
    } else {
      streak++;
      if (streak <= ABSENCE_GRACE) billable.push(r);
    }
  }
  return { billable, currentAbsenceStreak: streak };
}

/**
 * Sana/soni ko'rinishidagi eski interfeys (client deduksiya jadvali va boshqalar uchun).
 * Ichkarida computeBillableRecords'dan foydalanadi — mantiq bir joyda.
 */
export function computeBillable(
  records: { scheduledDate: string; present: boolean }[],
): { billableDates: string[]; billableCount: number; currentAbsenceStreak: number } {
  const { billable, currentAbsenceStreak } = computeBillableRecords(records);
  const billableDates = billable.map(r => r.scheduledDate);
  return { billableDates, billableCount: billableDates.length, currentAbsenceStreak };
}

/**
 * O'quvchining bitta guruhdagi to'lanadigan (billable) darslari sonidan cost hisoblaydi.
 * DIQQAT: bu JORIY narxdan hisoblaydi. Narx keyin o'zgarsa o'tgan davr ham qayta hisoblanadi.
 * Shu sabab yangi kod (K-2) o'rniga `billableCost` (dars narxi snapshot'i) ishlatadi.
 * Faqat snapshot yo'q bo'lgan holatlar uchun zaxira sifatida qoldirildi.
 */
export function groupCost(billableCount: number, price: number, lessonsPerMonth: number): number {
  return Math.round(billableCount * perLessonRate(price, lessonsPerMonth));
}

/**
 * K-2: narx snapshot'iga asoslangan cost. Har bir yozuv o'zining `rate` (dars yaratilganда
 * muzlatilgan dars narxi) qiymatini olib yuradi; faqat billable yozuvlar yig'iladi.
 * Narx keyin o'zgarsa o'tgan davrlar O'ZGARMAYDI (retroaktiv qayta hisob yo'q).
 * Doimiy rate holatida natija groupCost bilan bir xil (round(sum) == round(count×rate)).
 */
export function billableCost(
  records: { scheduledDate: string; present: boolean; rate: number }[],
): number {
  const { billable } = computeBillableRecords(records);
  return Math.round(billable.reduce((sum, r) => sum + r.rate, 0));
}
