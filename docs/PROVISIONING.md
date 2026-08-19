# Yangi mijoz qo'shish (provisioning)

Zyron CRM'ni yangi mijozga ulash endi **bitta buyruq**. Ilgari qo'lda bajarilgan
~10 qadam (`scripts/provision-tenant.sh`) avtomatlashtirilgan.

> Bu boshqaruv panelining birinchi "moduli". Kelajakda panel aynan shu skriptni
> SSH orqali chaqiradi — mantiq shu yerda, versiyalanadi va qo'lda ham ishlaydi.

---

## Bir martalik tayyorgarlik (VPS'da, faqat birinchi marta)

Contabo VPS (`84.46.252.77`), `deploy` foydalanuvchisi:

- `node`, `npm`, `git`, `openssl`, `nginx`, `certbot`, `dig` (dnsutils) o'rnatilgan.
- `pm2` global: `npm i -g pm2`
- PM2 reboot'da tiklanishi: `pm2 startup` (chiqqan buyruqni bir marta bajaring) → keyin har provisioning `pm2 save` qiladi.
- `deploy` uchun `nginx` va `certbot`'ga sudo ruxsati.

---

## Qadam 1 — DNS (ahost.uz, qo'lda)

Skriptdan **oldin** mijoz subdomeni uchun A-yozuv qo'shing:

```
crm.<mijoz>.uz   A   84.46.252.77
```

`zyron.uz` kabi o'z domenlaringiz **ahost.uz**'da boshqariladi (Vercel emas).
Mijozning o'z domeni bo'lsa — o'sha registratorda A-yozuv.

Propagatsiyani tekshirish:

```bash
dig +short crm.<mijoz>.uz     # 84.46.252.77 qaytishi kerak
```

DNS hali tayyor bo'lmasa ham skriptni `--no-ssl` bilan ishga tushirsangiz bo'ladi —
keyin certbot'ni qo'lda qo'shasiz.

---

## Qadam 2 — Provisioning (bitta buyruq)

VPS'da CRM repo ichida (masalan `~/zyron-crm`):

```bash
./scripts/provision-tenant.sh \
    --slug bright \
    --domain crm.brightschool.uz \
    --brand-name "Bright School" \
    --le-email siz@example.com
```

Skript avtomatik: checkout → bo'sh port → `.env` (yangi sekretlar) → `npm ci` →
`prisma db push` (alohida SQLite baza) → superadmin → `build` → PM2 → nginx → HTTPS.

Oxirida **superadmin login/parol** chiqadi — saqlab, mijozga xavfsiz yetkazing.

### Foydali bayroqlar

| Bayroq | Vazifa |
|--------|--------|
| `--port 4051` | portni qo'lda belgilash (default: 4050'dan bo'shini topadi) |
| `--admin-login admin` | superadmin login (default: `admin`) |
| `--admin-password '...'` | parolni o'zingiz berish (default: avtomatik generatsiya) |
| `--brand zyron` | Zyron logolari (default: `generic` — nomdan wordmark + avtomatik rang) |
| `--seed` | bo'sh baza o'rniga demo ma'lumot (sandbox/ko'rgazma uchun) |
| `--no-ssl` | certbot'ni o'tkazib yuborish (DNS hali tayyor emas) |
| `--branch main` | boshqa branch |

---

## Idempotentlik

Skriptni qayta ishga tushirish **xavfsiz**:

- Papka bor bo'lsa → `git pull` + qayta build (yangilanish uchun ham ishlatiladi).
- `.env` bor bo'lsa → **sekretlar saqlanadi** (qayta yaratilmaydi).
- PM2 process bor bo'lsa → `restart --update-env`.
- Sertifikat bor bo'lsa → certbot o'tkazib yuboriladi.

Ya'ni mijozni yangilash uchun ham xuddi shu buyruqni qayta chaqirasiz.

---

## Mijozni o'chirish (qo'lda)

```bash
pm2 delete zyron-<slug> && pm2 save
sudo rm /etc/nginx/sites-enabled/zyron-<slug> /etc/nginx/sites-available/zyron-<slug>
sudo nginx -t && sudo systemctl reload nginx
# ma'lumotni saqlab qo'yish tavsiya etiladi (o'chirishdan oldin):
tar czf ~/backups/zyron-<slug>-$(date +%F).tgz -C /home/deploy/apps zyron-<slug>
rm -rf /home/deploy/apps/zyron-<slug>
# sertifikatni ham (ixtiyoriy): sudo certbot delete --cert-name crm.<mijoz>.uz
```

---

## Brend — generic rejim (default)

Yangi mijoz avtomatik **generic** brend oladi (`NEXT_PUBLIC_BRAND=generic`):

- Logo o'rniga `--brand-name` dan **wordmark** (matn) va kvadrat **initsial belgi**.
- **Rang nomdan avtomatik hosil bo'ladi** — har mijoz o'ziga xos ko'rinadi, alohida
  logo/asset tayyorlash shart emas. Xohlasangiz `--brand-name` bilan birga env'ga
  `NEXT_PUBLIC_BRAND_HUE=210` (0-360) qo'yib rangni qo'lda belgilash mumkin.

Mijoz o'z tayyor logotipini bergач: `public/`ga SVG qo'shib `src/lib/brand.ts` da
alohida brend varianti yaratiladi (Zyron kabi), so'ng `--brand <nom>`.

> Eslatma: login/dashboard'da ba'zi urg'u ranglari (tugma, chip, o'ng panel) hali
> qat'iy ko'k (`#2660A4`). To'liq per-mijoz rang uchun ular `BRAND_COLORS` ga
> bog'lanishi kerak — bu keyingi yaxshilanish (logo/wordmark allaqachon to'g'ri).
