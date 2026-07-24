import { prisma } from '@/lib/db';

export async function createNotification(data: {
  type: string;
  title: string;
  message: string;
  link?: string;
  /** Filial (multi-branch) — null/undefined = global (barcha adminlarga ko'rinadi). */
  branchId?: string | null;
}) {
  return prisma.notification.create({ data });
}
