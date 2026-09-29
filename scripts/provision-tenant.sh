#!/usr/bin/env bash
#
# Zyron CRM — yangi mijoz (tenant) instance'ini BIR BUYRUQDA tayyorlaydi.
# Contabo VPS'da `deploy` foydalanuvchisi ostida ishga tushiriladi
# (nginx/certbot uchun sudo kerak).
#
# Bajaradigan qadamlar (idempotent — qayta ishga tushirish xavfsiz):
#   1. Repo checkout        -> $APPS_DIR/zyron-<slug>
#   2. Bo'sh port ajratish  (agar --port berilmasa)
#   3. .env yaratish        (JWT/CRON/WEBHOOK sekretlari, PORT, brend, APP_URL)
#   4. npm ci + prisma db push  (alohida SQLite baza)
#   5. Birinchi superadmin  (yoki --seed bilan demo ma'lumot)
#   6. npm run build        (brend build-time inline)
#   7. PM2 process          (unique nom + port, pm2 save)
#   8. Nginx site           (minimal proxy, Connection: upgrade YO'Q)
#   9. certbot HTTPS         (agar DNS tayyor bo'lsa)
#
# DNS (ahost.uz) SKRIPTDA EMAS: certbot'dan oldin A-yozuv qo'shilishi kerak:
#   <domain>  ->  <server IP>   (masalan crm.brightschool.uz -> 84.46.252.77)
#
# Foydalanish:
#   ./scripts/provision-tenant.sh \
#       --slug bright \
#       --domain crm.brightschool.uz \
#       --brand-name "Bright School" \
#       --le-email you@example.com
#
# Ixtiyoriy: --port 4051 --admin-login admin --admin-password 'xxx'
#            --brand zyron --seed --no-ssl --branch main
#            --repo https://github.com/suyunovdev/zyron-crm.git
#            --brand-color '#0F766E'  (runtime brend, DB Setting'ga yoziladi)
#            --tg-lead-channel @kanal --tg-lead-admin-chat -100123...
#
# Maxfiy qiymatlar argv'da EMAS, env orqali (ps'da ko'rinmasin):
#   PROVISION_ADMIN_PASSWORD   superadmin paroli (bo'lmasa tasodifiy yaratiladi)
#   PROVISION_TG_BOT_TOKEN     ota-ona boti tokeni (ixtiyoriy)
#   PROVISION_TG_LEAD_TOKEN    lid boti tokeni (ixtiyoriy)
#
# Oxirida mashina o'qiydigan qator (control panel uchun):
#   PROVISION_RESULT {"url":...,"port":...,"pm2":...,"dir":...}

set -euo pipefail

# ---------- ranglar / log ----------
if [ -t 1 ]; then
  C_G='\033[0;32m'; C_Y='\033[0;33m'; C_R='\033[0;31m'; C_B='\033[0;34m'; C_0='\033[0m'
else
  C_G=''; C_Y=''; C_R=''; C_B=''; C_0=''
fi
step() { echo -e "${C_B}==>${C_0} $*"; }
ok()   { echo -e "${C_G}  ok${C_0} $*"; }
warn() { echo -e "${C_Y}  ! ${C_0} $*"; }
die()  { echo -e "${C_R}XATO:${C_0} $*" >&2; exit 1; }

# ---------- standart qiymatlar ----------
REPO="https://github.com/suyunovdev/zyron-crm.git"
BRANCH="main"
BRANCH_GIVEN=0
APPS_DIR="/home/deploy/apps"
BASE_PORT=4050
ADMIN_LOGIN="admin"
ADMIN_PASSWORD="${PROVISION_ADMIN_PASSWORD:-}"
ADMIN_PASSWORD_GIVEN=0
[ -n "$ADMIN_PASSWORD" ] && ADMIN_PASSWORD_GIVEN=1
ADMIN_CREATED=0
BRAND_COLOR=""
TG_BOT_TOKEN="${PROVISION_TG_BOT_TOKEN:-}"
TG_LEAD_TOKEN="${PROVISION_TG_LEAD_TOKEN:-}"
TG_LEAD_CHANNEL=""
TG_LEAD_ADMIN_CHAT=""
# Shell o'zgaruvchilariga olindi — endi env'dan o'chiramiz: aks holda pm2 start/restart
# --update-env ularni jarayon env'iga (va pm2 save orqali ~/.pm2/dump.pm2 ga) yozadi.
unset PROVISION_ADMIN_PASSWORD PROVISION_TG_BOT_TOKEN PROVISION_TG_LEAD_TOKEN
BRAND="generic"     # generic = nomdan wordmark+rang (yangi mijoz uchun to'g'ri default)
                    # 'zyron' = Zyron logolar; '' = standart Aka-Uka logolar
BRAND_NAME=""
SLUG=""
DOMAIN=""
PORT=""
LE_EMAIL=""
DO_SEED=0
NO_SSL=0

# ---------- argumentlar ----------
while [ $# -gt 0 ]; do
  case "$1" in
    --seed|--no-ssl|-h|--help) ;;
    *) [ $# -ge 2 ] || die "$1 uchun qiymat berilmagan" ;;
  esac
  case "$1" in
    --slug)            SLUG="$2"; shift 2 ;;
    --domain)          DOMAIN="$2"; shift 2 ;;
    --brand-name)      BRAND_NAME="$2"; shift 2 ;;
    --brand)           BRAND="$2"; shift 2 ;;
    --port)            PORT="$2"; shift 2 ;;
    --admin-login)     ADMIN_LOGIN="$2"; shift 2 ;;
    --admin-password)  ADMIN_PASSWORD="$2"; ADMIN_PASSWORD_GIVEN=1; shift 2 ;;
    --brand-color)     BRAND_COLOR="$2"; shift 2 ;;
    --tg-lead-channel) TG_LEAD_CHANNEL="$2"; shift 2 ;;
    --tg-lead-admin-chat) TG_LEAD_ADMIN_CHAT="$2"; shift 2 ;;
    --le-email)        LE_EMAIL="$2"; shift 2 ;;
    --repo)            REPO="$2"; shift 2 ;;
    --branch)          BRANCH="$2"; BRANCH_GIVEN=1; shift 2 ;;
    --apps-dir)        APPS_DIR="$2"; shift 2 ;;
    --base-port)       BASE_PORT="$2"; shift 2 ;;
    --seed)            DO_SEED=1; shift ;;
    --no-ssl)          NO_SSL=1; shift ;;
    -h|--help)         grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "noma'lum argument: $1" ;;
  esac
done

# ---------- validatsiya ----------
[ -n "$SLUG" ]       || die "--slug majburiy (masalan: bright)"
[ -n "$DOMAIN" ]     || die "--domain majburiy (masalan: crm.brightschool.uz)"
[ -n "$BRAND_NAME" ] || die "--brand-name majburiy (masalan: \"Bright School\")"
echo "$SLUG" | grep -qE '^[a-z0-9][a-z0-9-]*$' || die "--slug faqat kichik harf/raqam/tire (a-z0-9-)"
echo "$DOMAIN" | grep -qE '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$' \
  || die "--domain noto'g'ri (kichik harf, masalan: crm.markaz.uz)"
if [ -n "$PORT" ]; then
  echo "$PORT" | grep -qE '^[0-9]{4,5}$' || die "--port raqam bo'lishi kerak"
fi
# .env/nginx'ga yoziladi — qo'shtirnoq, $, \, backtick va yangi qator taqiqlanadi
case "$BRAND_NAME" in *[\"\$\\\`]*|*$'\n'*) die "--brand-name da \" \$ \\ \` yoki yangi qator bo'lmasin" ;; esac
if [ -n "$TG_LEAD_CHANNEL" ]; then
  echo "$TG_LEAD_CHANNEL" | grep -qE '^@[A-Za-z0-9_]{4,32}$|^-?[0-9]{5,20}$' || die "--tg-lead-channel: @kanal yoki chat ID"
fi
if [ -n "$TG_LEAD_ADMIN_CHAT" ]; then
  echo "$TG_LEAD_ADMIN_CHAT" | grep -qE '^-?[0-9]{5,20}$' || die "--tg-lead-admin-chat: raqamli chat ID"
fi
if [ -n "$BRAND_COLOR" ]; then
  echo "$BRAND_COLOR" | grep -qE '^#[0-9A-Fa-f]{6}$' || die "--brand-color formati #RRGGBB bo'lishi kerak"
fi
if [ "$NO_SSL" -eq 0 ] && [ -z "$LE_EMAIL" ]; then
  die "--le-email majburiy (certbot uchun) yoki --no-ssl bering"
fi

for bin in git node npm openssl curl; do
  command -v "$bin" >/dev/null || die "$bin topilmadi — o'rnating"
done
command -v pm2 >/dev/null || die "pm2 topilmadi (npm i -g pm2)"

# Bir vaqtda faqat bitta provisioning (port tanlash va crontab o'qish-yozish poygasi bo'lmasin)
if command -v flock >/dev/null; then
  exec 9>/tmp/zyron-provision.lock
  flock -w 900 9 || die "boshqa provisioning 15 daqiqadan beri tugamayapti (/tmp/zyron-provision.lock)"
fi

NAME="zyron-$SLUG"
DIR="$APPS_DIR/$NAME"
NGINX_AVAIL="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
TEMPLATE_DIR="$(cd "$(dirname "$0")/.." && pwd)"   # bu repo ildizi (shablon manbai)

echo
step "Yangi tenant: ${C_G}$NAME${C_0}  ($DOMAIN)"
echo

# Telegram API: token curl argv'iga tushmasin (ps'da ko'rinadi) — URL stdin'dagi config orqali.
tg_api() {  # $1 = token, $2 = metod
  printf 'url = "https://api.telegram.org/bot%s/%s"\n' "$1" "$2" | curl -sS --max-time 15 -K - 2>/dev/null || true
}
tg_username() {
  tg_api "$1" getMe | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);if(j.ok)console.log(j.result.username)}catch{}})'
}
# Bot boshqa saytga (boshqa mijozga) ulangan bo'lsa — webhook'ni tortib olmaymiz
tg_foreign_host() {
  tg_api "$1" getWebhookInfo | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const u=JSON.parse(d).result.url;if(u){const h=new URL(u).host;if(h!==process.argv[1])console.log(h)}}catch{}})' "$DOMAIN"
}
TG_BOT_USERNAME=""; TG_LEAD_USERNAME=""
if [ -n "$TG_BOT_TOKEN" ]; then
  TG_BOT_USERNAME="$(tg_username "$TG_BOT_TOKEN" || true)"
  [ -n "$TG_BOT_USERNAME" ] || die "ota-ona bot tokeni noto'g'ri (Telegram getMe rad etdi)"
  other="$(tg_foreign_host "$TG_BOT_TOKEN" || true)"
  [ -z "$other" ] || die "@$TG_BOT_USERNAME boshqa saytga ulangan ($other) — boshqa bot tokenini bering"
fi
if [ -n "$TG_LEAD_TOKEN" ]; then
  TG_LEAD_USERNAME="$(tg_username "$TG_LEAD_TOKEN" || true)"
  [ -n "$TG_LEAD_USERNAME" ] || die "lid bot tokeni noto'g'ri (Telegram getMe rad etdi)"
  other="$(tg_foreign_host "$TG_LEAD_TOKEN" || true)"
  [ -z "$other" ] || die "@$TG_LEAD_USERNAME boshqa saytga ulangan ($other) — boshqa bot tokenini bering"
fi
[ -z "$TG_BOT_TOKEN" ] || [ "$TG_BOT_TOKEN" != "$TG_LEAD_TOKEN" ] || die "ota-ona va lid boti bir xil token bo'lolmaydi"

# Domen boshqa nginx saytida band bo'lmasin (masalan mavjud mijoz domeni)
if sudo grep -RlsE "server_name[^;]*[[:space:]]${DOMAIN//./\\.}[[:space:];]" "$NGINX_ENABLED" 2>/dev/null | grep -vx "$NGINX_ENABLED/$NAME" | grep -q .; then
  die "$DOMAIN boshqa nginx saytida band"
fi

# .env dagi kalitni qo'yish/almashtirish (qayta ishga tushirishda ham to'g'ri)
env_set() {
  local key="$1" val="$2" file="$DIR/.env"
  ( umask 077
    grep -v "^$key=" "$file" > "$file.tmp" || true
    printf '%s="%s"\n' "$key" "$val" >> "$file.tmp"
    mv "$file.tmp" "$file" )
  chmod 600 "$file"
}

# ---------- 1. repo checkout ----------
step "1/9  Repo checkout"
mkdir -p "$APPS_DIR"
if [ -d "$DIR/.git" ]; then
  # --branch berilmasa mavjud instance O'Z branch'ida qoladi (jimgina main'ga o'tib ketmasin)
  if [ "$BRANCH_GIVEN" -eq 0 ]; then
    BRANCH="$(git -C "$DIR" rev-parse --abbrev-ref HEAD)"
    [ "$BRANCH" != "HEAD" ] || die "$DIR detached HEAD holatida — --branch bering"
  fi
  warn "papka mavjud — git pull qilinadi ($DIR, branch: $BRANCH)"
  git -C "$DIR" fetch --quiet origin "$BRANCH"
  git -C "$DIR" checkout --quiet "$BRANCH"
  git -C "$DIR" reset --hard --quiet "origin/$BRANCH"
else
  [ -e "$DIR" ] && die "papka mavjud, lekin git repo emas: $DIR"
  git clone --quiet --branch "$BRANCH" "$REPO" "$DIR"
fi
ok "$DIR"

# ---------- 2. port ajratish ----------
port_in_use() { ss -ltnH "( sport = :$1 )" 2>/dev/null | grep -q .; }
port_in_nginx() { grep -RqsE "(127\.0\.0\.1|localhost):$1\b" "$NGINX_AVAIL" 2>/dev/null; }
port_in_envs() { grep -lsxE "PORT=\"?$1\"?" "$APPS_DIR"/*/.env 2>/dev/null | grep -vx "$DIR/.env" | grep -q .; }

step "2/9  Port"
OWN_PORT=""
[ -f "$DIR/.env" ] && OWN_PORT="$(grep -E '^PORT=' "$DIR/.env" | head -1 | cut -d= -f2 | tr -d '"' || true)"
if [ -z "$PORT" ] && [ -n "$OWN_PORT" ]; then
  PORT="$OWN_PORT"
  warn "mavjud .env dan port olindi: $PORT"
fi
if [ -n "$PORT" ] && [ "$PORT" != "$OWN_PORT" ]; then
  # Aniq berilgan port — boshqa ilovaniki bo'lsa to'xtaymiz (aks holda nginx begona mijozga proxy qiladi)
  if port_in_use "$PORT" || port_in_nginx "$PORT" || port_in_envs "$PORT"; then die "port band: $PORT"; fi
fi
if [ -z "$PORT" ]; then
  p="$BASE_PORT"
  while port_in_use "$p" || port_in_nginx "$p" || port_in_envs "$p"; do p=$((p+1)); done
  PORT="$p"
fi
ok "PORT=$PORT"

# ---------- 3. .env ----------
step "3/9  .env"
APP_URL="https://$DOMAIN"
if [ -f "$DIR/.env" ]; then
  warn ".env allaqachon mavjud — sekretlar SAQLANADI (qayta yaratilmaydi)"
else
  JWT_SECRET="$(openssl rand -base64 32)"
  CRON_SECRET="$(openssl rand -hex 24)"
  WEBHOOK_SECRET="$(openssl rand -hex 24)"
  ( umask 077; : > "$DIR/.env" )
  {
    echo "# Avto-yaratilgan: provision-tenant.sh ($NAME)"
    echo "DATABASE_URL=\"file:./$SLUG.db\""
    echo "JWT_SECRET=\"$JWT_SECRET\""
    echo "CRON_SECRET=\"$CRON_SECRET\""
    echo "WEBHOOK_SECRET=\"$WEBHOOK_SECRET\""
    echo "PORT=$PORT"
    echo "TZ=Asia/Tashkent"
    echo "NEXT_PUBLIC_APP_URL=\"$APP_URL\""
    echo "NEXT_PUBLIC_BRAND_NAME=\"$BRAND_NAME\""
    [ -n "$BRAND" ] && echo "NEXT_PUBLIC_BRAND=\"$BRAND\""
    [ "$DO_SEED" -eq 1 ] && echo "NEXT_PUBLIC_DEMO_MODE=true"
  } > "$DIR/.env"
  chmod 600 "$DIR/.env"
  ok "sekretlar yaratildi, .env yozildi (chmod 600)"
fi
env_set PLATFORM_CLIENT_URL "$APP_URL"
if [ -n "$TG_BOT_TOKEN" ]; then
  grep -q '^TELEGRAM_WEBHOOK_SECRET=' "$DIR/.env" || env_set TELEGRAM_WEBHOOK_SECRET "$(openssl rand -hex 24)"
  env_set TELEGRAM_BOT_TOKEN "$TG_BOT_TOKEN"
  env_set TELEGRAM_BOT_USERNAME "$TG_BOT_USERNAME"
  ok "ota-ona boti: @$TG_BOT_USERNAME"
fi
if [ -n "$TG_LEAD_TOKEN" ]; then
  grep -q '^TELEGRAM_LEAD_WEBHOOK_SECRET=' "$DIR/.env" || env_set TELEGRAM_LEAD_WEBHOOK_SECRET "$(openssl rand -hex 24)"
  env_set TELEGRAM_LEAD_BOT_TOKEN "$TG_LEAD_TOKEN"
  env_set TELEGRAM_LEAD_BOT_USERNAME "$TG_LEAD_USERNAME"
  [ -n "$TG_LEAD_CHANNEL" ] && env_set TELEGRAM_LEAD_CHANNEL "$TG_LEAD_CHANNEL"
  [ -n "$TG_LEAD_ADMIN_CHAT" ] && env_set TELEGRAM_LEAD_ADMIN_CHAT "$TG_LEAD_ADMIN_CHAT"
  ok "lid boti: @$TG_LEAD_USERNAME"
fi

# ---------- 4. paketlar + baza ----------
step "4/9  npm ci + prisma db push"
( cd "$DIR" && npm ci --silent )
( cd "$DIR" && npx prisma generate >/dev/null 2>&1 )
( cd "$DIR" && npx prisma db push --skip-generate )   # migrate EMAS (memory qoidasi)
ok "SQLite baza tayyor: prisma/$SLUG.db"

# ---------- 5. superadmin / seed ----------
step "5/9  Boshlang'ich ma'lumot"
if [ "$DO_SEED" -eq 1 ]; then
  ( cd "$DIR" && node scripts/seed-demo.mjs )
  ok "demo ma'lumot ekildi (login: demo/demo2024)"
else
  [ -n "$ADMIN_PASSWORD" ] || ADMIN_PASSWORD="$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9' | cut -c1-14)"
  boot_out="$(cd "$DIR" && PROVISION_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
      node scripts/bootstrap-superadmin.mjs --login "$ADMIN_LOGIN" --name "$BRAND_NAME admin")"
  printf '%s\n' "$boot_out" | grep -v '^BOOTSTRAP_' || true
  ADMIN_CREATED=0
  printf '%s' "$boot_out" | grep -q '^BOOTSTRAP_CREATED' && ADMIN_CREATED=1
  if [ "$ADMIN_CREATED" -eq 1 ]; then
    ok "superadmin yaratildi: $ADMIN_LOGIN (parol $( [ "$ADMIN_PASSWORD_GIVEN" -eq 1 ] && echo berilgan || echo yaratildi ))"
  else
    warn "superadmin avvaldan bor: $ADMIN_LOGIN — paroli O'ZGARTIRILMADI"
  fi
  # Runtime brend (superadmin "Markaz profili" tabidagi qiymatlar). Faqat bo'sh bo'lsa yoziladi —
  # qayta ishga tushirish mijoz keyin o'zgartirgan nom/rangni bosib ketmaydi. Demo (--seed) o'z
  # env brendini (Zyron logolari) saqlaydi — unga yozilmaydi.
  ( cd "$DIR" && node scripts/set-brand.mjs --if-empty --name "$BRAND_NAME" ${BRAND_COLOR:+--color "$BRAND_COLOR"} )
  ok "brend: $BRAND_NAME ${BRAND_COLOR}"
fi

# ---------- 6. build ----------
step "6/9  npm run build (brend inline)"
rm -f "$DIR/.next/BUILD_ID"
( cd "$DIR" && npm run build )
# Build to'liq tugamagan bo'lsa pm2 restart eski/yarim .next bilan 502 beradi
[ -f "$DIR/.next/BUILD_ID" ] || die "build to'liq tugamadi (.next/BUILD_ID yo'q) — pm2'ga tegilmadi"
ok "build tayyor"

# ---------- 7. PM2 ----------
step "7/9  PM2"
if pm2 describe "$NAME" >/dev/null 2>&1; then
  pm2 restart "$NAME" --update-env
  ok "restart: $NAME"
else
  ( cd "$DIR" && PORT="$PORT" TZ="Asia/Tashkent" NODE_ENV=production \
      pm2 start node_modules/next/dist/bin/next --name "$NAME" -- start )
  ok "start: $NAME (PORT=$PORT)"
fi
pm2 save >/dev/null
ok "pm2 save"
up=0
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null --max-time 5 "http://127.0.0.1:$PORT/login"; then up=1; break; fi
  sleep 2
done
[ "$up" -eq 1 ] || die "ilova 60 soniyada javob bermadi (pm2 logs $NAME)"

# ---------- 8. nginx ----------
step "8/9  Nginx"
TPL="$TEMPLATE_DIR/deploy/nginx-tenant.conf.template"
[ -f "$TPL" ] || die "nginx shabloni topilmadi: $TPL"
TMP_CONF="$(mktemp)"
sed -e "s/__DOMAIN__/$DOMAIN/g" -e "s/__PORT__/$PORT/g" "$TPL" > "$TMP_CONF"
HAD_CONF=0
if sudo test -f "$NGINX_AVAIL/$NAME"; then sudo cp "$NGINX_AVAIL/$NAME" "/tmp/$NAME.nginx.bak"; HAD_CONF=1; fi
sudo cp "$TMP_CONF" "$NGINX_AVAIL/$NAME"
rm -f "$TMP_CONF"
sudo ln -sf "$NGINX_AVAIL/$NAME" "$NGINX_ENABLED/$NAME"
if ! sudo nginx -t; then
  # Buzuq konfig sites-enabled'da qolsa, keyingi har qanday reload BARCHA saytlarni to'xtatadi
  if [ "$HAD_CONF" -eq 1 ]; then sudo mv "/tmp/$NAME.nginx.bak" "$NGINX_AVAIL/$NAME"
  else sudo rm -f "$NGINX_ENABLED/$NAME" "$NGINX_AVAIL/$NAME"; fi
  die "nginx -t xato — o'zgarish qaytarildi"
fi
sudo rm -f "/tmp/$NAME.nginx.bak"
sudo systemctl reload nginx
ok "nginx site: $NAME -> 127.0.0.1:$PORT"

# ---------- 9. HTTPS ----------
step "9/9  HTTPS (certbot)"
if [ "$NO_SSL" -eq 1 ]; then
  warn "--no-ssl: certbot o'tkazib yuborildi. DNS tayyor bo'lgach qo'lda:"
  warn "  sudo certbot --nginx -d $DOMAIN --redirect"
elif sudo test -d "/etc/letsencrypt/live/$DOMAIN"; then  # live/ faqat root o'qiydi
  # 8-qadam nginx konfigini shablondan qayta yozdi (SSL bloki yo'qoldi) — mavjud sertifikatni
  # qayta joylaymiz (yangi sertifikat so'ralmaydi). Aks holda 443'da boshqa sayt sertifikati chiqadi.
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --keep-until-expiring --redirect \
    ${LE_EMAIL:+--agree-tos -m "$LE_EMAIL"}
  ok "mavjud sertifikat nginx'ga qayta joylandi"
else
  SERVER_IP="$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
  DNS_IP="$(dig +short A "$DOMAIN" 2>/dev/null | tail -n1 || true)"
  if [ -n "$DNS_IP" ] && [ "$DNS_IP" = "$SERVER_IP" ]; then
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$LE_EMAIL" --redirect
    ok "HTTPS o'rnatildi (Let's Encrypt)"
  else
    warn "DNS hali bu serverga ishora qilmayapti (DNS=$DNS_IP, server=$SERVER_IP)."
    warn "ahost.uz da A-yozuv qo'shing:  $DOMAIN -> $SERVER_IP"
    warn "propagatsiyadan keyin:  sudo certbot --nginx -d $DOMAIN --redirect"
  fi
fi

# ---------- 10. Telegram webhook'lar + cron ----------
HTTPS_OK=0
if sudo test -d "/etc/letsencrypt/live/$DOMAIN" && sudo grep -q 'listen 443' "$NGINX_AVAIL/$NAME"; then HTTPS_OK=1; fi
if [ -n "$TG_BOT_TOKEN" ] || [ -n "$TG_LEAD_TOKEN" ]; then
  step "Telegram webhook"
  if [ "$HTTPS_OK" -eq 1 ]; then
    tg_hook() {  # $1 = skript, $2 = nom
      local out; out="$(cd "$DIR" && node "scripts/$1" "$APP_URL" 2>&1 || true)"
      if printf '%s' "$out" | grep -q 'Webhook was set'; then ok "$2 webhook o'rnatildi"
      else warn "$2 webhook o'rnatilmadi:"; printf '%s\n' "$out" | tail -5; fi
    }
    if [ -n "$TG_BOT_TOKEN" ]; then tg_hook tg-setup.mjs "ota-ona boti"; fi
    if [ -n "$TG_LEAD_TOKEN" ]; then tg_hook tg-lead-setup.mjs "lid boti"; fi
  else
    warn "HTTPS yo'q — webhook o'rnatilmadi (Telegram faqat https qabul qiladi)"
  fi
fi

step "Cron (auto-absent)"
CRON_SECRET_VAL="$(grep -E '^CRON_SECRET=' "$DIR/.env" | head -1 | cut -d= -f2- | tr -d '"' || true)"
[ -n "$CRON_SECRET_VAL" ] || die ".env da CRON_SECRET yo'q"
CRON_MARK="# zyron-tenant:$NAME"
CRON_LINE="*/30 * * * * curl -s -H \"x-cron-secret: $CRON_SECRET_VAL\" http://localhost:$PORT/api/cron/auto-absent >> $DIR/cron.log 2>&1 $CRON_MARK"
# crontab -l xato/bo'sh bo'lsa ham boshqa qatorlar yo'qolmaydi; faqat SHU tenant qatori almashtiriladi
CUR_CRON="$(crontab -l 2>/dev/null || true)"
{ printf '%s\n' "$CUR_CRON" | grep -vF "$CRON_MARK" | grep -v "localhost:$PORT/api/cron/auto-absent" || true
  printf '%s\n' "$CRON_LINE"; } | sed '/^$/d' | crontab -
ok "crontab: har 30 daqiqada auto-absent"

# ---------- xulosa ----------
echo
echo -e "${C_G}================ TAYYOR ================${C_0}"
echo "  Instance : $NAME"
echo "  Papka    : $DIR"
echo "  Manzil   : $APP_URL"
echo "  Port     : $PORT"
echo "  Baza     : $DIR/prisma/$SLUG.db"
if [ "$DO_SEED" -eq 0 ]; then
  echo "  Superadmin login : $ADMIN_LOGIN"
  # Berilgan parol qayta chiqarilmaydi (panel logiga tushmasin); faqat yaratilgan bo'lsa
  if [ "$ADMIN_CREATED" -eq 0 ]; then
    echo "  Superadmin parol : (o'zgarmadi — avvaldan bor)"
  elif [ "$ADMIN_PASSWORD_GIVEN" -eq 1 ]; then
    echo "  Superadmin parol : (berilgan)"
  else
    echo "  Superadmin parol : $ADMIN_PASSWORD"
    echo "  (bu parolni saqlab, mijozga xavfsiz yetkazing)"
  fi
fi
[ -n "$TG_BOT_USERNAME" ] && echo "  Ota-ona boti    : https://t.me/$TG_BOT_USERNAME"
[ -n "$TG_LEAD_USERNAME" ] && echo "  Lid boti        : https://t.me/$TG_LEAD_USERNAME"
echo -e "${C_G}=======================================${C_0}"
printf 'PROVISION_RESULT {"url":"%s","port":%s,"pm2":"%s","dir":"%s","https":%s,"adminCreated":%s,"parentBot":"%s","leadBot":"%s"}\n' \
  "$APP_URL" "$PORT" "$NAME" "$DIR" "$( [ "$HTTPS_OK" -eq 1 ] && echo true || echo false )" \
  "$( [ "$ADMIN_CREATED" -eq 1 ] && echo true || echo false )" "$TG_BOT_USERNAME" "$TG_LEAD_USERNAME"
