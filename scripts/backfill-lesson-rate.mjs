// K-2 backfill: mavjud darslarga narx snapshot'ini (perLessonRate) o'rnatadi.
//
// Nega: yangi `Lesson.perLessonRate` maydoni eski darslar uchun null bo'ladi.
// Bu skript har bir eski darsga o'sha darsning JORIY guruh narxini (price ÷ lessonsPerMonth)
// yozadi — shu bilan deploy vaqtida hech bir o'quvchi balansi/oyligi O'ZGARMAYDI
// (chunki avval ham joriy narxdan hisoblanardi). Bundan keyin narx o'zgarsa faqat
// KELAJAKDAGI darslar yangi narxda bo'ladi, o'tganlar muzlab qoladi.
//
// Ishlatish (har instance'da, deploy'dan keyin bir marta):
//   node scripts/backfill-lesson-rate.mjs
// Idempotent: faqat perLessonRate IS NULL bo'lgan darslarni yangilaydi.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.group.findMany({
    select: { id: true, price: true, lessonsPerMonth: true },
  });

  let totalUpdated = 0;
  for (const g of groups) {
    const rate = g.lessonsPerMonth > 0 ? g.price / g.lessonsPerMonth : 0;
    const res = await prisma.lesson.updateMany({
      where: { groupId: g.id, perLessonRate: null },
      data: { perLessonRate: rate },
    });
    if (res.count > 0) {
      totalUpdated += res.count;
      console.log(`  guruh ${g.id}: ${res.count} ta dars → rate ${Math.round(rate)}`);
    }
  }

  // Guruhi bo'lmagan yetim darslar (bo'lmasligi kerak, lekin xavfsizlik uchun) → 0
  const orphan = await prisma.lesson.updateMany({
    where: { perLessonRate: null },
    data: { perLessonRate: 0 },
  });
  if (orphan.count > 0) console.log(`  yetim darslar: ${orphan.count} → rate 0`);

  console.log(`\nBackfill tugadi. Jami yangilangan darslar: ${totalUpdated + orphan.count}`);
}

main()
  .catch((e) => { console.error('Backfill xatosi:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
