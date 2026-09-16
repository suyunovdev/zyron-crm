import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { normalizeSearch } from './search';

// User.name yozilgan har qanday joyda `searchName` ni avtomatik to'ldiradi
// (qidiruv normalizatsiyasi). Bitta markazda — hech qaysi create/update yo'lida
// unutilmaydi. Eslatma: name'ni `{ set: ... }` ko'rinishida yozadigan yo'l bu
// kod bazasida yo'q (hamma joyda `name: qiymat`), shuning uchun oddiy string
// tekshiruvi yetarli.
function withSearchName<T extends { name?: unknown }>(data: T): T {
  if (data && typeof data.name === 'string') {
    (data as { searchName?: string }).searchName = normalizeSearch(data.name);
  }
  return data;
}

function createPrismaClient() {
  return new PrismaClient().$extends({
    query: {
      user: {
        create({ args, query }) {
          withSearchName(args.data);
          return query(args);
        },
        update({ args, query }) {
          withSearchName(args.data);
          return query(args);
        },
        updateMany({ args, query }) {
          if (args.data && !Array.isArray(args.data)) withSearchName(args.data);
          return query(args);
        },
        upsert({ args, query }) {
          withSearchName(args.create);
          withSearchName(args.update);
          return query(args);
        },
        createMany({ args, query }) {
          if (Array.isArray(args.data)) args.data.forEach(withSearchName);
          else if (args.data) withSearchName(args.data);
          return query(args);
        },
      },
    },
  });
}

// Kengaytirilgan (extension'li) klient tipi. Boshqa modullar `prisma`ni parametr sifatida
// qabul qilganda shu tipdan foydalanadi (oddiy PrismaClient endi mos kelmaydi).
export type ExtendedPrisma = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: ExtendedPrisma;
  prismaPragmasSet?: boolean;
};

export const prisma: ExtendedPrisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// SQLite uchun ishlash/konkurentlik sozlamalari (faqat file: bazada, bir marta):
//  - WAL: parallel o'qishlar yozuv paytida bloklanmaydi (faylda saqlanadi)
//  - busy_timeout: "database is locked" xatosini kamaytiradi (5s kutadi)
//  - synchronous=NORMAL: WAL bilan xavfsiz va tezroq
// Postgres'ga o'tilsa bu blok o'tkazib yuboriladi.
if (!globalForPrisma.prismaPragmasSet && (process.env.DATABASE_URL || '').startsWith('file:')) {
  globalForPrisma.prismaPragmasSet = true;
  Promise.all([
    prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;'),
    prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;'),
    prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;'),
  ]).catch((e) => logger.error('[db] SQLite PRAGMA sozlashda xato', e));
}
