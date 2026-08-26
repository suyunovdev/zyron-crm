import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifyTgLinkToken, clearTgLinkToken } from '@/lib/tg-token';
import { sendMessage, editMessageText, answerCallbackQuery } from '@/lib/telegram';
import { getChildrenReport, getChildReport, getChildLessons } from '@/lib/parent-report';
import {
  childrenKeyboard, metricsKeyboard, backKeyboard, introKeyboard,
  welcomeText, chooseChildText, childMenuText, introText,
  gradesText, attendanceText, ratingText, debtText, groupsText,
  topicsMonthsKeyboard, topicsMonthsText, monthTopicsText, monthTopicsKeyboard,
} from '@/lib/tg-format';

// Ota-ona platformasi (mijoz subdomeni) — intro tugmasi uchun.
const PLATFORM_URL = process.env.PLATFORM_CLIENT_URL || 'https://my.akaukalarmarkazi.uz';

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
    // Tokensiz /start: bog'langan bo'lsa menyu, aks holda tanishuv (intro) + platforma tugmasi
    const linked = await prisma.user.findFirst({
      where: { telegramChatId: chatId },
      select: { name: true },
    });
    if (linked) {
      await showChildrenMenu(chatId, linked.name, true);
    } else {
      await sendMessage(chatId, introText(), introKeyboard(PLATFORM_URL));
    }
    return;
  }

  const parentId = await verifyTgLinkToken(token);
  if (!parentId) {
    await sendMessage(chatId, "Havola eskirgan yoki noto'g'ri. Platformaga qaytib, «Telegram'ga ulanish» tugmasini qayta bosing.");
    return;
  }

  // Shu farzandning ota-ona akkauntini chatga bog'laymiz. Bir chatga bir nechta akkaunt
  // bog'lanishi mumkin (aka-uka har biri alohida akkaunt) — shuning uchun rad etilmaydi,
  // har bir farzand o'z portalidan ulaydi, bot esa hammasini birga ko'rsatadi.
  try {
    await prisma.user.update({
      where: { id: parentId },
      data: { telegramChatId: chatId, telegramUsername: from.username || null, telegramLinkedAt: new Date() },
    });
  } catch (e) {
    logger.error('[telegram] bog\'lash xato', e, { parentId });
    await sendMessage(chatId, "Bog'lashda xatolik. Iltimos, birozdan so'ng qayta urinib ko'ring.");
    return;
  }

  // Bir martalik: token bog'langach bekor qilinadi
  await clearTgLinkToken(parentId);

  const parent = await prisma.user.findUnique({ where: { id: parentId }, select: { name: true } });
  await showChildrenMenu(chatId, parent?.name || 'Foydalanuvchi', true);
}

/** Farzand tanlash yoki (bitta bo'lsa) to'g'ridan-to'g'ri menyu ko'rsatadi. */
async function showChildrenMenu(chatId: string, parentName: string, greet: boolean): Promise<void> {
  const children = await getChildrenReport(chatId);

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

  const linked = await prisma.user.findFirst({
    where: { telegramChatId: chatId },
    select: { id: true },
  });
  if (!linked) {
    await answerCallbackQuery(cq.id, 'Iltimos, /start bosing');
    return;
  }
  if (!messageId) {
    await answerCallbackQuery(cq.id);
    return;
  }

  // "Farzandlar" ro'yxatiga qaytish
  if (data === 'back') {
    const children = await getChildrenReport(chatId);
    await editMessageText(chatId, messageId, chooseChildText(), childrenKeyboard(children));
    await answerCallbackQuery(cq.id);
    return;
  }

  const [action, childId, extra] = data.split(':'); // extra: tm: uchun oy (YYYY-MM)
  if (!childId) {
    await answerCallbackQuery(cq.id);
    return;
  }

  const child = await getChildReport(chatId, childId); // EGALIK tekshiruvi ichida
  if (!child) {
    await answerCallbackQuery(cq.id, 'Ma\'lumot topilmadi');
    return;
  }

  if (action === 'kid') {
    const count = await prisma.user.count({ where: { role: 'student', parent: { telegramChatId: chatId } } });
    await editMessageText(chatId, messageId, childMenuText(child), metricsKeyboard(childId, count > 1));
  } else if (action === 'g') {
    await editMessageText(chatId, messageId, gradesText(child), backKeyboard(childId));
  } else if (action === 'a') {
    await editMessageText(chatId, messageId, attendanceText(child), backKeyboard(childId));
  } else if (action === 'r') {
    await editMessageText(chatId, messageId, ratingText(child), backKeyboard(childId));
  } else if (action === 'd') {
    await editMessageText(chatId, messageId, debtText(child), backKeyboard(childId));
  } else if (action === 'gr') {
    await editMessageText(chatId, messageId, groupsText(child), backKeyboard(childId));
  } else if (action === 't') {
    // O'tilgan mavzular — oy tanlash
    const { months } = await getChildLessons(chatId, childId);
    await editMessageText(chatId, messageId, topicsMonthsText(child.name, months.length > 0), topicsMonthsKeyboard(childId, months));
  } else if (action === 'tm') {
    // Tanlangan oydagi barcha mavzular
    const { lessons } = await getChildLessons(chatId, childId);
    const monthLessons = lessons.filter(l => l.month === extra);
    await editMessageText(chatId, messageId, monthTopicsText(child.name, extra || '', monthLessons), monthTopicsKeyboard(childId));
  }

  await answerCallbackQuery(cq.id);
}
