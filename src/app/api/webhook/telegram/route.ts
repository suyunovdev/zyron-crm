import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifyTgLinkToken } from '@/lib/tg-token';
import { sendMessage, editMessageText, answerCallbackQuery } from '@/lib/telegram';
import { getChildrenReport, getChildReport } from '@/lib/parent-report';
import {
  childrenKeyboard, metricsKeyboard, backKeyboard,
  welcomeText, chooseChildText, childMenuText,
  gradesText, attendanceText, ratingText, debtText,
} from '@/lib/tg-format';

// Telegram webhook — ota-onalar boti.
// Xavfsizlik: X-Telegram-Bot-Api-Secret-Token == TELEGRAM_WEBHOOK_SECRET.
// Telegramga DOIM 200 qaytariladi (aks holda update qayta-qayta yuboriladi).

interface TgUser { id: number; username?: string; first_name?: string }
interface TgMessage { message_id: number; from?: TgUser; text?: string }
interface TgCallback { id: string; from: TgUser; message?: { message_id: number }; data?: string }
interface TgUpdate { message?: TgMessage; callback_query?: TgCallback }

export async function POST(req: NextRequest) {
  try {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expected) {
      logger.error('[telegram webhook] TELEGRAM_WEBHOOK_SECRET sozlanmagan');
      return NextResponse.json({ error: 'not configured' }, { status: 500 });
    }
    if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const update = (await req.json().catch(() => ({}))) as TgUpdate;
    // Xatolarni yutamiz — Telegramga baribir 200 (retry oldini olish)
    await handleUpdate(update).catch(err => logger.error('[telegram webhook] handler xato', err));

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('[POST /api/webhook/telegram]', error);
    // Baribir 200 — Telegram qayta yubormasin
    return NextResponse.json({ ok: true });
  }
}

/** Update turini aniqlab tegishli handler'ga yo'naltiradi (polling uchun ham qayta ishlatsa bo'ladi). */
export async function handleUpdate(update: TgUpdate): Promise<void> {
  if (update.message?.text?.startsWith('/start')) {
    await handleStart(update.message);
  } else if (update.callback_query) {
    await handleCallback(update.callback_query);
  }
}

// ─── /start <token> — bog'lash ───

async function handleStart(msg: TgMessage): Promise<void> {
  const from = msg.from;
  if (!from) return;
  const chatId = String(from.id);

  const token = (msg.text || '').split(/\s+/)[1];
  if (!token) {
    await sendMessage(chatId, "Salom! Bu bot ota-onalar uchun. Iltimos, platformadagi «Telegram'ga ulanish» tugmasi orqali kiring.");
    return;
  }

  const parentId = await verifyTgLinkToken(token);
  if (!parentId) {
    await sendMessage(chatId, "Havola eskirgan yoki noto'g'ri. Platformaga qaytib, «Telegram'ga ulanish» tugmasini qayta bosing.");
    return;
  }

  // Bu chat allaqachon biror ota-onaga bog'langanmi?
  const existing = await prisma.user.findUnique({
    where: { telegramChatId: chatId },
    select: { id: true },
  });
  if (existing && existing.id !== parentId) {
    await sendMessage(chatId, "Bu Telegram akkaunt allaqachon boshqa foydalanuvchiga bog'langan.");
    return;
  }

  if (!existing) {
    try {
      await prisma.user.update({
        where: { id: parentId },
        data: { telegramChatId: chatId, telegramUsername: from.username || null, telegramLinkedAt: new Date() },
      });
    } catch (e) {
      // @unique poyga holati (P2002) — bir vaqtda bog'lanish
      logger.error('[telegram] bog\'lash xato', e, { parentId });
      await sendMessage(chatId, "Bog'lashda xatolik. Iltimos, birozdan so'ng qayta urinib ko'ring.");
      return;
    }
  }

  const parent = await prisma.user.findUnique({ where: { id: parentId }, select: { name: true } });
  await showChildrenMenu(chatId, parentId, parent?.name || 'Foydalanuvchi', true);
}

/** Farzand tanlash yoki (bitta bo'lsa) to'g'ridan-to'g'ri menyu ko'rsatadi. */
async function showChildrenMenu(chatId: string, parentId: string, parentName: string, greet: boolean): Promise<void> {
  const children = await getChildrenReport(parentId);

  if (children.length === 0) {
    await sendMessage(chatId, `Assalomu alaykum, ${parentName}!\n\nSizga hali farzand biriktirilmagan. Iltimos, o'quv markazi ma'muriyatiga murojaat qiling.`);
    return;
  }

  if (children.length === 1) {
    const c = children[0];
    const header = greet ? welcomeText(parentName) + '\n\n' : '';
    await sendMessage(chatId, header + childMenuText(c), metricsKeyboard(c.id, false));
    return;
  }

  const text = greet ? welcomeText(parentName) : chooseChildText();
  await sendMessage(chatId, text, childrenKeyboard(children));
}

// ─── callback_query — tugmalar ───

async function handleCallback(cq: TgCallback): Promise<void> {
  const chatId = String(cq.from.id);
  const messageId = cq.message?.message_id;
  const data = cq.data || '';

  const parent = await prisma.user.findUnique({
    where: { telegramChatId: chatId },
    select: { id: true },
  });
  if (!parent) {
    await answerCallbackQuery(cq.id, 'Iltimos, /start bosing');
    return;
  }
  if (!messageId) {
    await answerCallbackQuery(cq.id);
    return;
  }

  // "Farzandlar" ro'yxatiga qaytish
  if (data === 'back') {
    const children = await getChildrenReport(parent.id);
    await editMessageText(chatId, messageId, chooseChildText(), childrenKeyboard(children));
    await answerCallbackQuery(cq.id);
    return;
  }

  const [action, childId] = data.split(':');
  if (!childId) {
    await answerCallbackQuery(cq.id);
    return;
  }

  const child = await getChildReport(parent.id, childId); // EGALIK tekshiruvi ichida
  if (!child) {
    await answerCallbackQuery(cq.id, 'Ma\'lumot topilmadi');
    return;
  }

  if (action === 'kid') {
    const count = await prisma.user.count({ where: { parentId: parent.id, role: 'student' } });
    await editMessageText(chatId, messageId, childMenuText(child), metricsKeyboard(childId, count > 1));
  } else if (action === 'g') {
    await editMessageText(chatId, messageId, gradesText(child), backKeyboard(childId));
  } else if (action === 'a') {
    await editMessageText(chatId, messageId, attendanceText(child), backKeyboard(childId));
  } else if (action === 'r') {
    await editMessageText(chatId, messageId, ratingText(child), backKeyboard(childId));
  } else if (action === 'd') {
    await editMessageText(chatId, messageId, debtText(child), backKeyboard(childId));
  }

  await answerCallbackQuery(cq.id);
}
