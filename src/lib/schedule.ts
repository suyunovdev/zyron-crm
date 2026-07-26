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
