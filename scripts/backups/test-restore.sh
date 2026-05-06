#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_FILE=""
TARGET_DB_URL_ENV="LOCAL_RESTORE_DB_URL"
EXECUTE=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/backups/test-restore.sh [--plan]
  scripts/backups/test-restore.sh --execute --backup-file FILE [--target-db-url-env LOCAL_RESTORE_DB_URL]

Runs a restore drill against a local/dev database and verifies core Volturiano tables exist.

Safe defaults:
  - Defaults to --plan.
  - Execution delegates to restore-db.sh, which requires local/dev target confirmation.
  - The verification checks schema presence only; it does not inspect private customer rows.

Required for --execute:
  - BACKUP_FILE from backup-db.sh
  - LOCAL_RESTORE_DB_URL or the env name passed with --target-db-url-env
  - psql and pg_restore on PATH

Examples:
  scripts/backups/test-restore.sh --plan
  LOCAL_RESTORE_DB_URL="postgres://..." scripts/backups/test-restore.sh --execute --backup-file backups/db/volturiano-db-20260504.dump
USAGE
}

log() {
  printf '[test-restore] %s\n' "$*"
}

die() {
  printf '[test-restore] ERROR: %s\n' "$*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --plan)
      EXECUTE=0
      shift
      ;;
    --execute)
      EXECUTE=1
      shift
      ;;
    --backup-file)
      BACKUP_FILE="$2"
      shift 2
      ;;
    --target-db-url-env)
      TARGET_DB_URL_ENV="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

log "Mode: $([[ "$EXECUTE" -eq 1 ]] && printf execute || printf plan)"
log "Backup file: ${BACKUP_FILE:-<not provided>}"
log "Target DB URL env: $TARGET_DB_URL_ENV"

if [[ "$EXECUTE" -ne 1 ]]; then
  cat <<PLAN

Plan only. Restore drill steps:
  1. Create a fresh local/dev database.
  2. Export $TARGET_DB_URL_ENV="<local/dev PostgreSQL URL>".
  3. Run:
     scripts/backups/test-restore.sh --execute --backup-file "${BACKUP_FILE:-backups/db/volturiano-db-example.dump}" --target-db-url-env "$TARGET_DB_URL_ENV"
  4. Verify the script reports all required core tables as present.

CI smoke usage:
  bash scripts/backups/backup-db.sh --plan
  bash scripts/backups/backup-storage-manifest.sh --plan
  bash scripts/backups/restore-db.sh --plan --backup-file backups/db/example.dump
  bash scripts/backups/test-restore.sh --plan
PLAN
  exit 0
fi

[[ -n "$BACKUP_FILE" ]] || die "--backup-file is required"
command -v psql >/dev/null 2>&1 || die "psql is not installed or not on PATH"

"$ROOT_DIR/scripts/backups/restore-db.sh" \
  --execute \
  --backup-file "$BACKUP_FILE" \
  --target-db-url-env "$TARGET_DB_URL_ENV" \
  --confirm RESTORE_LOCAL_DEV

TARGET_DB_URL="${!TARGET_DB_URL_ENV:-}"
[[ -n "$TARGET_DB_URL" ]] || die "$TARGET_DB_URL_ENV is not set"

REQUIRED_TABLES=(
  "profiles"
  "projects"
  "components"
  "community_submissions"
  "published_sites"
  "credit_transactions"
  "agent_sessions"
  "audit_logs"
  "gdpr_requests"
)

missing=0
for table in "${REQUIRED_TABLES[@]}"; do
  exists="$(psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -Atc "select to_regclass('public.$table') is not null")"
  if [[ "$exists" == "t" ]]; then
    log "Verified table: public.$table"
  else
    printf '[test-restore] Missing table after restore: public.%s\n' "$table" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  die "Restore drill failed table verification"
fi

log "Restore drill completed successfully."
