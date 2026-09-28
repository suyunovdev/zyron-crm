// Runtime brendni (superadmin "Markaz profili" bilan bir xil Setting kalitlari) yozadi.
// provision-tenant.sh yangi markaz uchun chaqiradi; qo'lda ham ishlatsa bo'ladi.
//
// Foydalanish:
//   node scripts/set-brand.mjs --name "Nur Academy" [--color "#0F766E"]
// Idempotent: qayta ishga tushirish qiymatlarni shunchaki yangilaydi.

import { PrismaClient } from '@prisma/client';

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const name = arg('--name')?.trim().replace(/\s+/g, ' ');
const color = arg('--color');

if (!name || name.length < 2 || name.length > 80) {
  console.error('Foydalanish: node scripts/set-brand.mjs --name "<markaz nomi, 2-80 belgi>" [--color "#RRGGBB"]');
  process.exit(1);
}
if (color !== undefined && !/^#[0-9a-f]{6}$/i.test(color)) {
  console.error('Xato: --color formati #RRGGBB bo\'lishi kerak');
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const values = { brandName: name, ...(color ? { brandColor: color } : {}) };
  for (const [key, value] of Object.entries(values)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log(`Brend yozildi: ${name}${color ? ` (${color})` : ''}`);
} finally {
  await prisma.$disconnect();
}
