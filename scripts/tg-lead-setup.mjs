// Lid yig'uvchi Telegram bot webhook'ini sozlaydi (setWebhook + setMyCommands).
// Foydalanish:  node scripts/tg-lead-setup.mjs <public-https-base-url>
// Misol:        node scripts/tg-lead-setup.mjs https://crm.akaukalarmarkazi.uz
//
// Env (.env):  TELEGRAM_LEAD_BOT_TOKEN, TELEGRAM_LEAD_WEBHOOK_SECRET
// Webhook manzili avtomatik: <base>/api/webhook/telegram-funnel
//
// ⚠️ Kanal a'zoligi ishlashi uchun: bot TELEGRAM_LEAD_CHANNEL kanalida ADMIN bo'lishi shart.

import 'dotenv/config';

const base = process.argv[2];
const token = process.env.TELEGRAM_LEAD_BOT_TOKEN;
const secret = process.env.TELEGRAM_LEAD_WEBHOOK_SECRET;

if (!token || !secret) {
  console.error("Xato: TELEGRAM_LEAD_BOT_TOKEN yoki TELEGRAM_LEAD_WEBHOOK_SECRET .env'da yo'q.");
  process.exit(1);
}
if (!base || !/^https:\/\//.test(base)) {
  console.error('Foydalanish: node scripts/tg-lead-setup.mjs <public-https-base-url>');
  process.exit(1);
}

const API = `https://api.telegram.org/bot${token}`;
const url = `${base.replace(/\/$/, '')}/api/webhook/telegram-funnel`;

async function call(method, payload) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

console.log(`→ setWebhook: ${url}`);
console.log(await call('setWebhook', {
  url,
  secret_token: secret,
  allowed_updates: ['message', 'callback_query'],
  drop_pending_updates: true,
}));

console.log('→ setMyCommands');
console.log(await call('setMyCommands', {
  commands: [{ command: 'start', description: 'Ro‘yxatdan o‘tish / ariza qoldirish' }],
}));

console.log('→ getWebhookInfo');
console.log(JSON.stringify(await fetch(`${API}/getWebhookInfo`).then(r => r.json()), null, 2));

if (process.env.TELEGRAM_LEAD_CHANNEL) {
  console.log(`\nEslatma: bot ${process.env.TELEGRAM_LEAD_CHANNEL} kanalida ADMIN bo'lishi shart (a'zolik tekshiruvi uchun).`);
}
