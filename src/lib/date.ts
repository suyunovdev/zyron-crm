const TZ = 'Asia/Tashkent';

/**
 * Returns current date/time in Asia/Tashkent timezone.
 * Use this instead of `new Date()` for display and month calculations.
 */
export function nowTashkent(): Date {
  const str = new Date().toLocaleString('en-US', { timeZone: TZ });
  return new Date(str);
}

/** Returns current month string in "YYYY-MM" format (Tashkent timezone) */
export function currentMonthTz(): string {
  const now = nowTashkent();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Returns today's date string in "YYYY-MM-DD" format (Tashkent timezone) */
export function todayTz(): string {
  const now = nowTashkent();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ─── O'zbekcha sana/vaqt formatlash (locale'ga bog'liq EMAS) ───
//
// Sabab: `toLocaleString('uz-UZ', { month: 'short' })` to'liq o'zbek locale
// ma'lumoti bo'lmaganda oyni "M07" ("root" ICU fallback) qilib chiqaradi.
// Shuning uchun oy/hafta nomlarini o'zimiz beramiz. Vaqt brauzer/process
// mahalliy zonasida ko'rsatiladi (O'zbekiston UTC+5, prod TZ=Asia/Tashkent).

const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const WEEKDAYS_SHORT = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
const pad2 = (n: number) => String(n).padStart(2, '0');

/** "24.07.2026" */
export function fmtDate(input: string | number | Date): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** "24 Iyl" */
export function fmtDayMonth(input: string | number | Date): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "24 Iyl, 23:07" */
export function fmtDateTime(input: string | number | Date): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "Jum, 24 Iyl" */
export function fmtWeekdayDay(input: string | number | Date): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return '';
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
