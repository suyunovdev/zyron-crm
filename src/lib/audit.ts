import { prisma } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * Audit jurnaliga yozuv qo'shadi (kim nima o'zgartirgani).
 * Xato bo'lsa asosiy amalni bloklamaydi — faqat logga chiqadi.
 */
export async function logAudit(
  actor: SessionUser,
  action: string,
  entity: string,
  entityId: string | null,
  summary: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action,
        entity,
        entityId,
        summary,
      },
    });
  } catch (e) {
    logger.error('[audit] yozib bo\'lmadi', e, { action, entity });
  }
}
