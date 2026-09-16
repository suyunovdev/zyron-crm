// Mavjud foydalanuvchilarga qidiruv uchun `searchName` ustunini to'ldiradi.
// Yangi yozuvlarni db.ts extension avtomatik to'ldiradi; bu skript faqat ESKI
// ma'lumot uchun (searchName qo'shilgunga qadar yaratilganlar).
// Idempotent: faqat noto'g'ri/bo'sh searchName'ni yangilaydi. Xavfsiz, qayta-qayta ishlaydi.
// Foydalanish:  node scripts/backfill-search-name.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// MUHIM: src/lib/search.ts dagi normalizeSearch bilan AYNAN bir xil bo'lishi shart.
const APOSTROPHE_VARIANTS = /[ʻʼ‘’'`´′]/g;
const normalizeSearch = (s) =>
  (s || '').toLowerCase().replace(APOSTROPHE_VARIANTS, '').replace(/\s+/g, ' ').trim();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, searchName: true } });
  let updated = 0;
  for (const u of users) {
    const want = normalizeSearch(u.name);
    if (u.searchName !== want) {
      await prisma.user.update({ where: { id: u.id }, data: { searchName: want } });
      updated++;
    }
  }
  console.log(`Backfill tugadi: ${users.length} ta foydalanuvchi tekshirildi, ${updated} ta yangilandi.`);
}

main()
  .catch((e) => { console.error('Backfill xatosi:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
