import { prisma } from '@/lib/db';
import { telegramConfigured, sendMessage } from '@/lib/telegram';
import { logger } from '@/lib/logger';

// Avto-push: muhim voqealarda (darsga kelmaslik, yangi to'lov) ota-onaga Telegram xabar.
// FIRE-AND-FORGET: hech qachon throw qilmaydi, asosiy so'rov oqimini bloklamaydi.

/**
 * Farzand (studentId) ning ota-onasiga Telegram xabar yuboradi.
 * Ota-ona Telegramga ulanmagan yoki bot sozlanmagan bo'lsa — jimgina o'tkazib yuboradi.
 */
export async function pushToParent(studentId: string, text: string): Promise<void> {
  try {
    if (!telegramConfigured()) return;

    const child = await prisma.user.findUnique({
      where: { id: studentId },
      select: { parentId: true },
    });
    if (!child?.parentId) return;

    const parent = await prisma.user.findUnique({
      where: { id: child.parentId },
      select: { telegramChatId: true },
    });
    if (!parent?.telegramChatId) return;

    await sendMessage(parent.telegramChatId, text);
  } catch (e) {
    // Push muvaffaqiyatsizligi asosiy amalni buzmasin — faqat log
    logger.error('[tg-notify] pushToParent xato', e, { studentId });
  }
}
