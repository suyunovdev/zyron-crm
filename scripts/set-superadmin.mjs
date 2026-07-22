// Mavjud foydalanuvchini superadmin qilib tayinlaydi (bootstrap).
// Foydalanish:  node scripts/set-superadmin.mjs <login>
// Misol:        node scripts/set-superadmin.mjs admin

import { PrismaClient } from '@prisma/client';

const login = process.argv[2];
if (!login) {
  console.error('Foydalanish: node scripts/set-superadmin.mjs <login>');
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({ where: { login } });
  if (!user) {
    console.error(`Foydalanuvchi topilmadi: ${login}`);
    process.exit(1);
  }
  if (user.role === 'superadmin') {
    console.log(`"${login}" allaqachon superadmin.`);
  } else {
    await prisma.user.update({ where: { login }, data: { role: 'superadmin' } });
    console.log(`✓ "${login}" (${user.name}) endi superadmin.`);
  }
} finally {
  await prisma.$disconnect();
}
