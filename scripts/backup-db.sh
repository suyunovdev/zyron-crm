#!/usr/bin/env bash
#
# SQLite bazasini zaxiralash (agar production'da SQLite ishlatilsa).
# Neon/PostgreSQL'da esa provayderning avtomatik backup'idan foydalaning
# (Neon PITR yoqing) — bu skript SQLite uchun.
#
# Foydalanish:   ./scripts/backup-db.sh [db_fayl]
# Cron misoli:   0 2 * * *  /var/www/zyron-academy/scripts/backup-db.sh
#
set -euo pipefail

DB="${1:-prisma/dev.db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

if [ ! -f "$DB" ]; then
  echo "Xato: baza fayli topilmadi: $DB" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d_%H%M%S)
OUT="$BACKUP_DIR/backup_$TS.db"

# .backup — ishlab turgan baza uchun xavfsiz (WAL bilan ham)
sqlite3 "$DB" ".backup '$OUT'"
gzip "$OUT"

# Eski zaxiralarni tozalash
find "$BACKUP_DIR" -name 'backup_*.db.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Zaxira yaratildi: ${OUT}.gz"
