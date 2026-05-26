#!/bin/bash
# Database backup script for evminds (Supabase)
# Usage: ./scripts/backup-db.sh
# Backups are saved to backups/ with timestamp. Keeps last 10.

set -euo pipefail

BACKUP_DIR="$(dirname "$0")/../backups"
PG_DUMP="/opt/homebrew/opt/postgresql@17/bin/pg_dump"
HOST="aws-1-eu-west-1.pooler.supabase.com"
PORT="5432"
USER="postgres.pjpfsclekrvsvwftpkyv"
DB="postgres"
MAX_BACKUPS=10

# Credentials are read from ~/.pgpass (chmod 600). pg_dump prompts if missing.

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="evminds_backup_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "Starting backup..."
"$PG_DUMP" -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" \
  --no-owner --no-privileges \
  -t articles -t sources -t cron.job \
  | gzip > "$FILEPATH"

SIZE=$(du -h "$FILEPATH" | cut -f1)
echo "Backup saved: $FILEPATH ($SIZE)"

# Remove old backups (keep last MAX_BACKUPS)
cd "$BACKUP_DIR"
ls -t evminds_backup_*.sql.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f
TOTAL=$(ls evminds_backup_*.sql.gz 2>/dev/null | wc -l | tr -d ' ')
echo "Total backups: $TOTAL (max: $MAX_BACKUPS)"
