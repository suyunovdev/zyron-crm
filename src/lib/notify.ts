import { prisma } from '@/lib/db';

export async function createNotification(data: {
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  return prisma.notification.create({ data });
}
