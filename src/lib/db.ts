import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPragmasSet?: boolean;
};

export const prisma = globalForPrisma.prisma || new PrismaClient();

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
