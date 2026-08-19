import { logger } from '@/lib/logger';

// Telegram Bot API integratsiyasi (ota-onalar boti).
// Sozlash (env): TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET.
// Kutubxonasiz — native fetch (eskiz.ts qolipi). Barcha xabar parse_mode=HTML.

const API = 'https://api.telegram.org';

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/** HTML parse_mode uchun xavfli belgilarni ekranlash (ism/matn ichida). */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface InlineKeyboard {
  inline_keyboard: { text: string; callback_data: string }[][];
}

interface TgOutcome<T = unknown> { ok: boolean; result?: T; error?: string }

/** Past-level Bot API chaqiruv. Hech qachon throw qilmaydi — {ok,error} qaytaradi. */
async function tgCall<T = unknown>(method: string, payload: object): Promise<TgOutcome<T>> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN sozlanmagan' };
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      logger.error('[telegram] API xato', undefined, { method, status: res.status, description: json?.description });
      return { ok: false, error: json?.description || `HTTP ${res.status}` };
    }
    return { ok: true, result: json.result as T };
  } catch (e) {
    logger.error('[telegram] fetch exception', e, { method });
    return { ok: false, error: (e as Error).message };
  }
}

/** Yangi xabar yuborish (ixtiyoriy inline keyboard bilan). */
export function sendMessage(chatId: number | string, text: string, keyboard?: InlineKeyboard) {
  return tgCall('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: keyboard } : {}),
  });
}

/** Mavjud xabarni tahrirlash (tugma bosilganda bir xabarda navigatsiya). */
export function editMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  keyboard?: InlineKeyboard,
) {
  return tgCall('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(keyboard ? { reply_markup: keyboard } : {}),
  });
}

/** Callback tugmasidagi "soatcha"ni to'xtatish (ixtiyoriy toast matni bilan). */
export function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return tgCall('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

/** Webhook'ni ro'yxatga olish (secret_token bilan). Bir martalik sozlash. */
export function setWebhook(url: string, secretToken: string) {
  return tgCall('setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message', 'callback_query'],
  });
}

/** Bot komandalar ro'yxati (menyu tugmasi). */
export function setMyCommands() {
  return tgCall('setMyCommands', {
    commands: [{ command: 'start', description: 'Botni ishga tushirish' }],
  });
}

/** Bot ma'lumoti (username aniqlash uchun — getMe). */
export function getMe() {
  return tgCall<{ id: number; username: string; first_name: string }>('getMe', {});
}
