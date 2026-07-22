# Zyron Academy — Aka-Uka Ta'lim Markazi CRM

Ta'lim markazi uchun boshqaruv platformasi: o'quvchilar, ustozlar, guruhlar,
davomat, to'lovlar, lidlar (CRM) va ota-ona kabineti.

## Texnologiyalar

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Prisma 6** — lokalda SQLite, production'da PostgreSQL/Neon tavsiya etiladi
- **jose** (JWT) + **bcryptjs** — autentifikatsiya
- **Tailwind CSS 4**, framer-motion, lucide-react
- **Vitest** — testlar

## Rollar

| Rol | Domen | Kirish |
|-----|-------|--------|
| `superadmin` / `admin` | `crm.*` | To'liq boshqaruv |
| `teacher` | `crm.*` | O'z guruhlari, davomat |
| `student` | `my.*` | O'z guruhlari, davomat, balans |
| `parent` | `my.*` | Farzand(lar) nazorati |

RBAC `src/proxy.ts` (middleware) va `requireAuth()` orqali ikki qatlamda ta'minlanadi.

## Boshlash

```bash
# 1. Bog'liqliklarni o'rnatish
npm install

# 2. Muhitni sozlash
cp .env.example .env   # keyin qiymatlarni to'ldiring

# 3. Bazani tayyorlash
npx prisma migrate dev
npm run db:seed        # demo ma'lumotlar

# 4. Dev serverni ishga tushirish
npm run dev            # http://localhost:3000
```

### Demo loginlar (seed)

| Rol | Login | Parol |
|-----|-------|-------|
| Admin | `admin` | `admin123` |
| O'qituvchi | `shahboz` | `teacher123` |
| O'quvchi | `zoir` | `student123` |

## Skriptlar

```bash
npm run dev        # dev server (Turbopack)
npm run build      # production build
npm run start      # production server
npm run lint       # ESLint
npm run test       # Vitest (biznes-logika testlari)
npm run db:seed    # bazani demo ma'lumot bilan to'ldirish
npm run db:reset   # migratsiyani reset + seed
```

## Biznes-logika

- **Billing** (`src/lib/billing.ts`) — yagona hisob-kitob manbasi.
  Balans = jami to'langan − (qatnashgan darslar × oylik narx ÷ oyiga darslar).
  `student/balance` va `admin/stats` shu manbadan foydalanadi (nomuvofiqlik yo'q).
- **Davomat** — teacher dars boshlanishidan 15 min oldindan kun oxirigacha
  (ertasi 00:00) belgilaydi. Muhlatdan keyin `cron/auto-absent` belgilanmaganlarni
  "absent" qiladi; tuzatishni faqat admin qila oladi.

## Deploy

Batafsil: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Qisqacha:
1. Production'da `DATABASE_URL` ni PostgreSQL/Neon ga o'tkazing.
2. `JWT_SECRET` va `CRON_SECRET` ni env'ga qo'ying (kuchli qiymatlar).
3. `npm run build && npm run start` — PM2/systemd orqali (`ecosystem.config.js`).
4. `cron/auto-absent` ni har 30 daqiqada chaqiradigan cron sozlang.
