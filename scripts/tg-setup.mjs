// Telegram bot webhook'ini sozlaydi (setWebhook + setMyCommands).
// Foydalanish:  node scripts/tg-setup.mjs <public-base-url>
// Misol (prod):  node scripts/tg-setup.mjs https://my.akaukalarmarkazi.uz
// Misol (dev):   node scripts/tg-setup.mjs https://<ngrok-yoki-cloudflared>.trycloudflare.com
//
// Env (.env):  TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET
// Webhook manzili avtomatik: <base>/api/webhook/telegram

import 'dotenv/config';

const base = process.argv[2];
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token || !secret) {
  console.error("Xato: TELEGRAM_BOT_TOKEN yoki TELEGRAM_WEBHOOK_SECRET .env'da yo'q.");
  process.exit(1);
}
if (!base || !/^https:\/\//.test(base)) {
  console.error('Foydalanish: node scripts/tg-setup.mjs <public-https-base-url>');
  process.exit(1);
}

const API = `https://api.telegram.org/bot${token}`;
const url = `${base.replace(/\/$/, '')}/api/webhook/telegram`;

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
  commands: [{ command: 'start', description: 'Botni ishga tushirish' }],
}));

console.log('→ getWebhookInfo');
const info = await fetch(`${API}/getWebhookInfo`).then(r => r.json());
console.log(JSON.stringify(info, null, 2));
