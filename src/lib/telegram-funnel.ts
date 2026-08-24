import { logger } from '@/lib/logger';
import type { InlineKeyboard } from '@/lib/telegram';

// Lid yig'uvchi Telegram bot (bo'lajak o'quvchilar funnel) — ota-ona botidan ALOHIDA.
// Sozlash (env): TELEGRAM_LEAD_BOT_TOKEN, TELEGRAM_LEAD_WEBHOOK_SECRET,
//   TELEGRAM_LEAD_CHANNEL (majburiy a'zolik), TELEGRAM_LEAD_ADMIN_CHAT (staff xabari).
// Kutubxonasiz — native fetch. parse_mode=HTML.

const API = 'https://api.telegram.org';

export function funnelConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_LEAD_BOT_TOKEN);
}

/** Reply keyboard (masalan telefon so'rash — request_contact). */
export interface ReplyKeyboard {
  keyboard: { text: string; request_contact?: boolean }[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
}
export interface RemoveKeyboard { remove_keyboard: true }
type Markup = InlineKeyboard | ReplyKeyboard | RemoveKeyboard;

interface TgOutcome<T = unknown> { ok: boolean; result?: T; error?: string }

/** Past-level Bot API chaqiruv (lid-bot tokeni bilan). Hech qachon throw qilmaydi. */
async function tgCall<T = unknown>(method: string, payload: object): Promise<TgOutcome<T>> {
  const token = process.env.TELEGRAM_LEAD_BOT_TOKEN;
  if (!token) return { ok: false, error: 'TELEGRAM_LEAD_BOT_TOKEN sozlanmagan' };
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      logger.error('[telegram-funnel] API xato', undefined, { method, status: res.status, description: json?.description });
      return { ok: false, error: json?.description || `HTTP ${res.status}` };
    }
    return { ok: true, result: json.result as T };
  } catch (e) {
    logger.error('[telegram-funnel] fetch exception', e, { method });
    return { ok: false, error: (e as Error).message };
  }
}

/** Xabar yuborish (inline yoki reply keyboard, yoki keyboardni olib tashlash). */
export function sendMessage(chatId: number | string, text: string, markup?: Markup) {
  return tgCall('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(markup ? { reply_markup: markup } : {}),
  });
}

/** Mavjud xabarni tahrirlash (inline keyboard bilan — navigatsiya). */
export function editMessageText(chatId: number | string, messageId: number, text: string, keyboard?: InlineKeyboard) {
  return tgCall('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: keyboard } : {}),
  });
}

/** Callback tugmasidagi "soatcha"ni to'xtatish. */
export function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return tgCall('answerCallbackQuery', { callback_query_id: callbackQueryId, ...(text ? { text } : {}) });
}

interface ChatMember { status: string }
/**
 * Foydalanuvchi kanalga a'zomi? (member/administrator/creator = a'zo).
 * Bot kanalda ADMIN bo'lishi shart. Kanal sozlanmagan bo'lsa — true (gate o'chiq).
 */
export async function isChannelMember(userId: number | string): Promise<boolean> {
  const channel = process.env.TELEGRAM_LEAD_CHANNEL;
  if (!channel) return true; // gate o'chiq
  const r = await tgCall<ChatMember>('getChatMember', { chat_id: channel, user_id: userId });
  if (!r.ok || !r.result) return false; // xatoda — kirituvchini kiritmaymiz
  return ['creator', 'administrator', 'member'].includes(r.result.status);
}

/** Staff guruhga (agar sozlangan bo'lsa) xabar — yangi ariza bildirishnomasi. */
export async function notifyStaff(text: string): Promise<void> {
  const chat = process.env.TELEGRAM_LEAD_ADMIN_CHAT;
  if (!chat) return;
  await sendMessage(chat, text);
}

/** Webhook ro'yxatga olish (setup skript uchun). */
export function setWebhook(url: string, secretToken: string) {
  return tgCall('setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });
}
