/**
 * Server jarayoni ishga tushganda ishlaydi (Next.js instrumentation).
 * Butun ilova vaqtini O'zbekiston (Asia/Tashkent, UTC+5) ga o'rnatadi —
 * server qaysi timezone'da bo'lishidan qat'i nazar (prod: Contabo Europe/Berlin).
 * Shu tufayli barcha server new Date(), oy/kun hisoblari, davomat oynasi va
 * cron to'g'ri O'zbekiston vaqtida ishlaydi.
 */
export function register() {
  process.env.TZ = 'Asia/Tashkent';
}
