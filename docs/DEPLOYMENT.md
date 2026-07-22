# Deploy qo'llanmasi — Zyron Academy

Bu hujjat production'ga chiqarish va professional darajaga yetkazish bosqichlarini
tavsiflaydi.

---

## 1. Muhit o'zgaruvchilari (majburiy)

`.env` faylida quyidagilar bo'lishi shart (`.env.example` dan nusxa oling):

| O'zgaruvchi | Tavsif |
|-------------|--------|
| `DATABASE_URL` | Baza ulanish satri (Contabo VPS'da SQLite `file:` yoki localhost Postgres) |
| `JWT_SECRET` | JWT imzo kaliti — `openssl rand -base64 32` |
| `CRON_SECRET` | auto-absent cron sekret — `openssl rand -hex 24` |
| `WEBHOOK_SECRET` | Saytdan lid webhook sekret |

> ⚠️ `CRON_SECRET` va `WEBHOOK_SECRET` endi **majburiy** — sozlanmasa tegishli
> endpoint 500 qaytaradi (koddagi zaxira qiymatlar xavfsizlik uchun olib tashlangan).

---

## 2. Ma'lumotlar bazasi (Contabo VPS)

Loyiha o'zimiz boshqaradigan **Contabo VPS**da turadi (Vercel/serverless emas).
Shuning uchun **Neon kabi tashqi bulut DB tavsiya etilmaydi** — u serverless uchun
mo'ljallangan; VPS'da ilova ↔ bulut orasida ortiqcha tarmoq kechikishi paydo bo'ladi.

### Variant A — SQLite + WAL (joriy, tavsiya etiladi)

Bitta ta'lim markazi, bitta VPS, bitta Node jarayoni uchun SQLite yetarli.
Kod avtomatik ravishda ishga tushganda quyidagilarni yoqadi (`src/lib/db.ts`):

- **WAL** — parallel o'qishlar yozuvni bloklamaydi
- **busy_timeout=5000** — "database is locked" xatosini kamaytiradi
- **synchronous=NORMAL** — WAL bilan xavfsiz va tezroq

> WAL faylda saqlanadi. Bir marta qo'lda ham yoqish mumkin:
> ```bash
> sqlite3 prisma/dev.db "PRAGMA journal_mode=WAL;"
> ```
> Backup — 5-bo'limdagi `scripts/backup-db.sh` (kunlik cron).

### Variant B — PostgreSQL **shu Contabo VPS'da** (kelajak uchun)

Agar keyinchalik kuchliroq konkurentlik yoki bir nechta app instance kerak
bo'lsa — Postgres'ni Neon'da emas, **shu VPS'ga** o'rnating (`localhost`), shunda
ma'lumot serverda qoladi va kechikish bo'lmaydi:

1. `sudo apt install postgresql` va baza/foydalanuvchi yarating.
2. `prisma/schema.prisma` da provayderni o'zgartiring:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. `.env`: `DATABASE_URL="postgresql://user:pass@localhost:5432/zyron?schema=public"`
4. Migratsiyalarni qaytadan yarating (SQLite migratsiyalari Postgres'ga mos emas):
   ```bash
   rm -rf prisma/migrations && npx prisma migrate dev --name init
   ```

> Neon faqat ilovaning o'zini Vercel'ga ko'chirsangizgina mantiqli bo'ladi.

---

## 3. Jarayon menejeri (avto-restart)

Ilova o'chib qolmasligi (va reboot'da tiklanishi) uchun **PM2** yoki **systemd**.

### PM2
```bash
npm ci && npm run build
pm2 start ecosystem.config.js
pm2 startup   # reboot'da avtomatik ishga tushirish
pm2 save
```

### systemd (muqobil)
```bash
sudo cp deploy/zyron-academy.service /etc/systemd/system/
# faylda WorkingDirectory/User qiymatlarini moslang
sudo systemctl daemon-reload
sudo systemctl enable --now zyron-academy
```

Ilova `PORT=3000` da ishlaydi — nginx uni 443 (HTTPS) ga proksilaydi.
(nginx upstream porti ilova porti bilan mos bo'lishi shart.)

---

## 4. Cron — auto-absent

Belgilanmagan davomatni kun oxirida "absent" qilish uchun har 30 daqiqada chaqiring:

```cron
*/30 * * * * curl -s -H "x-cron-secret: $CRON_SECRET" https://crm.akaukalarmarkazi.uz/api/cron/auto-absent
```

---

## 5. Zaxira (backup)

- **SQLite**: `scripts/backup-db.sh` (kunlik cron):
  ```cron
  0 2 * * * /var/www/zyron-academy/scripts/backup-db.sh
  ```
- **Neon/Postgres**: provayderning avtomatik backup / PITR'ini yoqing.

---

## 6. CI/CD

`.github/workflows/ci.yml` har push/PR'da: typecheck → lint → test → build.
Deploy'ni shu pipeline oxiriga qo'shish mumkin (SSH yoki Vercel).

---

## Yig'ma tekshiruv ro'yxati

- [ ] `.env` to'ldirilgan (4 ta sekret)
- [ ] DB: SQLite+WAL (yoki VPS'dagi localhost Postgres) — Neon EMAS
- [ ] PM2/systemd bilan ishlaydi, reboot'da tiklanadi
- [ ] nginx 443 → ilova porti proksilaydi
- [ ] auto-absent cron sozlangan
- [ ] backup cron sozlangan
- [ ] CI yashil
