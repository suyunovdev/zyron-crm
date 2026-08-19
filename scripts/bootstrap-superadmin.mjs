// Yangi (bo'sh) bazada BIRINCHI superadmin hisobini yaratadi.
// set-superadmin.mjs faqat mavjud userni ko'taradi — bu esa noldan yaratadi.
//
// Foydalanish:
//   node scripts/bootstrap-superadmin.mjs --login admin --name "Bosh admin" [--phone "+998..."]
//   Parol: --password bilan yoki (xavfsizroq) PROVISION_ADMIN_PASSWORD env orqali.
//
// Idempotent: login allaqachon bo'lsa parolni almashtirmaydi, faqat superadmin
// rolini kafolatlaydi (qayta ishga tushirish xavfsiz).

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const login = arg('--login');
const name = arg('--name') || login;
const phone = arg('--phone') || null;
const password = arg('--password') || process.env.PROVISION_ADMIN_PASSWORD;

if (!login || !password) {
  console.error('Foydalanish: node scripts/bootstrap-superadmin.mjs --login <login> --name <ism> --password <parol>');
  console.error('(parolni PROVISION_ADMIN_PASSWORD env orqali ham berish mumkin)');
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing) {
    if (existing.role !== 'superadmin') {
      await prisma.user.update({ where: { login }, data: { role: 'superadmin' } });
      console.log(`Mavjud "${login}" superadmin qilib ko'tarildi (parol saqlanib qoldi).`);
    } else {
      console.log(`"${login}" allaqachon superadmin - o'zgarish yo'q.`);
    }
  } else {
    await prisma.user.create({
      data: {
        login,
        password: bcrypt.hashSync(password, 10),
        name,
        phone,
        role: 'superadmin',
      },
    });
    console.log(`Superadmin yaratildi: ${login}`);
  }
} finally {
  await prisma.$disconnect();
}
