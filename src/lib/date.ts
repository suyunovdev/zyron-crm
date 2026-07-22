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
