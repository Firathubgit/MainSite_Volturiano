#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET_DB_URL_ENV="LOCAL_RESTORE_DB_URL"
BACKUP_FILE=""
EXECUTE=0
CONFIRM_VALUE=""
ALLOW_NONLOCAL=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/backups/restore-db.sh [--plan] --backup-file FILE [--target-db-url-env ENV_NAME]
  scripts/backups/restore-db.sh --execute --backup-file FILE --target-db-url-env LOCAL_RESTORE_DB_URL --confirm RESTORE_LOCAL_DEV

Restores a database backup into a target database.

Safe defaults:
  - Defaults to --plan.
  - Refuses execution unless --execute and --confirm RESTORE_LOCAL_DEV are passed.
  - Refuses non-local targets unless --allow-nonlocal is passed.
  - Never prints the target database URL.

Supported backup formats:
  - .dump / .backup / .custom: restored with pg_restore --clean --if-exists
  - .sql: restored with psql -f

Examples:
  scripts/backups/restore-db.sh --plan --backup-file backups/db/example.dump
  LOCAL_RESTORE_DB_URL="postgres://..." scripts/backups/restore-db.sh --execute --backup-file backups/db/example.dump --confirm RESTORE_LOCAL_DEV
USAGE
}

log() {
  printf '[restore-db] %s\n' "$*"
}

die() {
  printf '[restore-db] ERROR: %s\n' "$*" >&2
  exit 1
}

is_local_target() {
  local url="$1"
  [[ "$url" == *"localhost"* || "$url" == *"127.0.0.1"* || "$url" == *"host.docker.internal"* ]]
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
    --confirm)
      CONFIRM_VALUE="$2"
      shift 2
      ;;
    --allow-nonlocal)
      ALLOW_NONLOCAL=1
      shift
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
log "Non-local target allowed: $ALLOW_NONLOCAL"

if [[ "$EXECUTE" -ne 1 ]]; then
  cat <<PLAN

Plan only. To restore into a local/dev database:
  export $TARGET_DB_URL_ENV="<local/dev PostgreSQL URL>"
  scripts/backups/restore-db.sh --execute --backup-file "${BACKUP_FILE:-backups/db/volturiano-db-example.dump}" --target-db-url-env "$TARGET_DB_URL_ENV" --confirm RESTORE_LOCAL_DEV

Execution safety:
  - Target must look local unless --allow-nonlocal is explicitly passed.
  - Restore uses --clean/--if-exists for custom dumps, so the target database contents can be replaced.
  - Never run this against production unless a human-approved incident runbook says so.
PLAN
  exit 0
fi

[[ -n "$BACKUP_FILE" ]] || die "--backup-file is required"
[[ -f "$BACKUP_FILE" ]] || die "Backup file does not exist: $BACKUP_FILE"
[[ "$CONFIRM_VALUE" == "RESTORE_LOCAL_DEV" ]] || die "Missing --confirm RESTORE_LOCAL_DEV"

TARGET_DB_URL="${!TARGET_DB_URL_ENV:-}"
[[ -n "$TARGET_DB_URL" ]] || die "$TARGET_DB_URL_ENV is not set"

if [[ "$ALLOW_NONLOCAL" -ne 1 ]] && ! is_local_target "$TARGET_DB_URL"; then
  die "Target database URL does not look local/dev. Pass --allow-nonlocal only after an approved restore plan."
fi

case "$BACKUP_FILE" in
  *.dump|*.backup|*.custom)
    command -v pg_restore >/dev/null 2>&1 || die "pg_restore is not installed or not on PATH"
    log "Restoring custom-format backup into target database..."
    pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$TARGET_DB_URL" "$BACKUP_FILE"
    ;;
  *.sql)
    command -v psql >/dev/null 2>&1 || die "psql is not installed or not on PATH"
    log "Restoring SQL file into target database..."
    psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$BACKUP_FILE"
    ;;
  *)
    die "Unsupported backup extension. Use .dump, .backup, .custom, or .sql"
    ;;
esac

log "Restore completed."
