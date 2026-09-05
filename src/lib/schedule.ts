// Guruh dars kunlari — yagona manba (yorliq + validatsiya).
// toq = Dush/Chor/Jum (1,3,5) · juft = Sesh/Pay/Shan (2,4,6) · boshqa = maxsus.

export const DAY_MAP: Record<string, number[]> = {
  toq: [1, 3, 5],   // Mon, Wed, Fri
  juft: [2, 4, 6],  // Tue, Thu, Sat
};

/** Qisqa ko'rinish: "Dush/Chor/Jum" / "Sesh/Pay/Shan" / "" */
export function dayTypeShort(dayType?: string | null): string {
  if (dayType === 'toq') return 'Dush/Chor/Jum';
  if (dayType === 'juft') return 'Sesh/Pay/Shan';
  return '';
}

/** To'liq, izchil yorliq: "Toq (Dush/Chor/Jum)" / "Juft (Sesh/Pay/Shan)" / "Boshqa" */
export function dayTypeLabel(dayType?: string | null): string {
  if (dayType === 'toq') return 'Toq (Dush/Chor/Jum)';
  if (dayType === 'juft') return 'Juft (Sesh/Pay/Shan)';
  return 'Boshqa';
}

/**
 * Berilgan sana (YYYY-MM-DD) guruh dayType jadvaliga mos dars kunimi?
 *  - toq/juft: hafta kuniga qarab tekshiriladi.
 *  - boshqa (yoki noma'lum): true (maxsus jadval — cheklanmaydi).
 */
export function isLessonDay(dayType: string | null | undefined, dateStr: string): boolean {
  const allowed = dayType ? DAY_MAP[dayType] : undefined;
  if (!allowed) return true; // "boshqa" yoki noma'lum — cheklamaymiz
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return true;
  const dow = new Date(y, m - 1, d).getDay(); // 0=Yak ... 6=Shan
  return allowed.includes(dow);
}

/** Sana → "YYYY-MM-DD" (mahalliy komponentlar bo'yicha — isLessonDay bilan izchil). */
export function fmtLessonDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Guruh jadvali bo'yicha dars sanalarini hisoblaydi (SOF funksiya — DB'siz, test qilinadi).
 * dayType (toq/juft) hafta kunlariga aylanadi; startDate'dan `months` oy (yoki `endDate`
 * gacha, inklyuziv) oralig'idagi mos kunlar qaytariladi. Sanalar mahalliy komponentlar
 * bilan quriladi (isLessonDay bilan bir xil — UTC/mahalliy drift bo'lmaydi).
 * toq/juft'dan boshqa dayType (masalan "boshqa") → xato: avtomatik generatsiya qilinmaydi.
 */
export function computeLessonDates(opts: {
  startDate: string;
  dayType: string;
  months?: number;
  endDate?: string;
}): string[] {
  const { startDate, dayType, months = 12, endDate } = opts;
  const allowed = DAY_MAP[dayType];
  if (!allowed) {
    throw new Error(`Noto'g'ri dayType: ${dayType}. "toq" yoki "juft" bo'lishi kerak.`);
  }

  const [sy, sm, sd] = startDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  let end: Date;
  if (endDate) {
    const [ey, em, ed] = endDate.split('-').map(Number);
    end = new Date(ey, em - 1, ed);
    end.setDate(end.getDate() + 1); // endDate ni ham qamrashi uchun (inklyuziv)
  } else {
    end = new Date(sy, sm - 1, sd);
    end.setMonth(end.getMonth() + months);
  }

  const dates: string[] = [];
  const cur = new Date(start);
  while (cur < end) {
    if (allowed.includes(cur.getDay())) dates.push(fmtLessonDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}
