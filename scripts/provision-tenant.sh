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
APPS_DIR="/home/deploy/apps"
BASE_PORT=4050
ADMIN_LOGIN="admin"
ADMIN_PASSWORD=""
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
    --slug)            SLUG="$2"; shift 2 ;;
    --domain)          DOMAIN="$2"; shift 2 ;;
    --brand-name)      BRAND_NAME="$2"; shift 2 ;;
    --brand)           BRAND="$2"; shift 2 ;;
    --port)            PORT="$2"; shift 2 ;;
    --admin-login)     ADMIN_LOGIN="$2"; shift 2 ;;
    --admin-password)  ADMIN_PASSWORD="$2"; shift 2 ;;
    --le-email)        LE_EMAIL="$2"; shift 2 ;;
    --repo)            REPO="$2"; shift 2 ;;
    --branch)          BRANCH="$2"; shift 2 ;;
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
if [ "$NO_SSL" -eq 0 ] && [ -z "$LE_EMAIL" ]; then
  die "--le-email majburiy (certbot uchun) yoki --no-ssl bering"
fi

for bin in git node npm openssl; do
  command -v "$bin" >/dev/null || die "$bin topilmadi — o'rnating"
done
command -v pm2 >/dev/null || die "pm2 topilmadi (npm i -g pm2)"

NAME="zyron-$SLUG"
DIR="$APPS_DIR/$NAME"
NGINX_AVAIL="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
TEMPLATE_DIR="$(cd "$(dirname "$0")/.." && pwd)"   # bu repo ildizi (shablon manbai)

echo
step "Yangi tenant: ${C_G}$NAME${C_0}  ($DOMAIN)"
echo

# ---------- 1. repo checkout ----------
step "1/9  Repo checkout"
mkdir -p "$APPS_DIR"
if [ -d "$DIR/.git" ]; then
  warn "papka mavjud — git pull qilinadi ($DIR)"
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
port_in_nginx() { grep -Rqs "127.0.0.1:$1\b" "$NGINX_AVAIL" 2>/dev/null; }

step "2/9  Port"
if [ -z "$PORT" ] && [ -f "$DIR/.env" ]; then
  PORT="$(grep -E '^PORT=' "$DIR/.env" | head -1 | cut -d= -f2 | tr -d '"' || true)"
  [ -n "$PORT" ] && warn "mavjud .env dan port olindi: $PORT"
fi
if [ -z "$PORT" ]; then
  p="$BASE_PORT"
  while port_in_use "$p" || port_in_nginx "$p"; do p=$((p+1)); done
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
  ( cd "$DIR" && PROVISION_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
      node scripts/bootstrap-superadmin.mjs --login "$ADMIN_LOGIN" --name "$BRAND_NAME admin" )
  ok "superadmin: $ADMIN_LOGIN"
fi

# ---------- 6. build ----------
step "6/9  npm run build (brend inline)"
( cd "$DIR" && npm run build )
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

# ---------- 8. nginx ----------
step "8/9  Nginx"
TPL="$TEMPLATE_DIR/deploy/nginx-tenant.conf.template"
[ -f "$TPL" ] || die "nginx shabloni topilmadi: $TPL"
TMP_CONF="$(mktemp)"
sed -e "s/__DOMAIN__/$DOMAIN/g" -e "s/__PORT__/$PORT/g" "$TPL" > "$TMP_CONF"
sudo cp "$TMP_CONF" "$NGINX_AVAIL/$NAME"
rm -f "$TMP_CONF"
sudo ln -sf "$NGINX_AVAIL/$NAME" "$NGINX_ENABLED/$NAME"
sudo nginx -t
sudo systemctl reload nginx
ok "nginx site: $NAME -> 127.0.0.1:$PORT"

# ---------- 9. HTTPS ----------
step "9/9  HTTPS (certbot)"
if [ "$NO_SSL" -eq 1 ]; then
  warn "--no-ssl: certbot o'tkazib yuborildi. DNS tayyor bo'lgach qo'lda:"
  warn "  sudo certbot --nginx -d $DOMAIN --redirect"
elif [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  ok "sertifikat allaqachon mavjud — o'tkazib yuborildi"
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
  echo "  Superadmin parol : $ADMIN_PASSWORD"
  echo "  (bu parolni saqlab, mijozga xavfsiz yetkazing)"
fi
echo
echo "  Auto-absent cron (ixtiyoriy, crontab -e):"
echo "    */30 * * * * curl -s -H \"x-cron-secret: <CRON_SECRET>\" $APP_URL/api/cron/auto-absent"
echo -e "${C_G}=======================================${C_0}"
