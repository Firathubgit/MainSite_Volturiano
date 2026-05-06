#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT_DIR/backups/db"
DB_URL_ENV="SUPABASE_DB_URL"
LABEL="$(date -u +"%Y%m%dT%H%M%SZ")"
EXECUTE=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/backups/backup-db.sh [--plan] [--execute] [--out-dir DIR] [--label LABEL] [--db-url-env ENV_NAME]

Creates a PostgreSQL/Supabase database backup.

Safe defaults:
  - Defaults to --plan. No files are created unless --execute is passed.
  - Never prints the database URL.
  - Uses pg_dump custom format plus a schema-only SQL dump.

Required for --execute:
  - pg_dump on PATH
  - SUPABASE_DB_URL or the env name passed with --db-url-env

Examples:
  scripts/backups/backup-db.sh --plan
  SUPABASE_DB_URL="postgres://..." scripts/backups/backup-db.sh --execute
USAGE
}

log() {
  printf '[backup-db] %s\n' "$*"
}

die() {
  printf '[backup-db] ERROR: %s\n' "$*" >&2
  exit 1
}

hash_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    printf 'sha256-unavailable'
  fi
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
    --out-dir)
      OUT_DIR="$2"
      shift 2
      ;;
    --label)
      LABEL="$2"
      shift 2
      ;;
    --db-url-env)
      DB_URL_ENV="$2"
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

BACKUP_FILE="$OUT_DIR/volturiano-db-$LABEL.dump"
SCHEMA_FILE="$OUT_DIR/volturiano-schema-$LABEL.sql"
MANIFEST_FILE="$OUT_DIR/volturiano-db-$LABEL.manifest.json"

log "Mode: $([[ "$EXECUTE" -eq 1 ]] && printf execute || printf plan)"
log "Output directory: $OUT_DIR"
log "Backup file: $BACKUP_FILE"
log "Schema file: $SCHEMA_FILE"
log "Manifest file: $MANIFEST_FILE"
log "Database URL env: $DB_URL_ENV"

if [[ "$EXECUTE" -ne 1 ]]; then
  cat <<PLAN

Plan only. To run the backup:
  export $DB_URL_ENV="<Supabase pooled or direct database URL>"
  scripts/backups/backup-db.sh --execute --out-dir "$OUT_DIR" --label "$LABEL" --db-url-env "$DB_URL_ENV"

Commands that will run:
  pg_dump "\$$DB_URL_ENV" --format=custom --no-owner --no-privileges --file "$BACKUP_FILE"
  pg_dump "\$$DB_URL_ENV" --schema-only --no-owner --no-privileges --file "$SCHEMA_FILE"
PLAN
  exit 0
fi

DB_URL="${!DB_URL_ENV:-}"
[[ -n "$DB_URL" ]] || die "$DB_URL_ENV is not set"
command -v pg_dump >/dev/null 2>&1 || die "pg_dump is not installed or not on PATH"

mkdir -p "$OUT_DIR"
log "Starting full custom-format dump..."
pg_dump "$DB_URL" --format=custom --no-owner --no-privileges --file "$BACKUP_FILE"

log "Starting schema-only SQL dump..."
pg_dump "$DB_URL" --schema-only --no-owner --no-privileges --file "$SCHEMA_FILE"

BACKUP_SHA="$(hash_file "$BACKUP_FILE")"
SCHEMA_SHA="$(hash_file "$SCHEMA_FILE")"

cat > "$MANIFEST_FILE" <<JSON
{
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "label": "$LABEL",
  "database_url_env": "$DB_URL_ENV",
  "files": {
    "backup": {
      "path": "$BACKUP_FILE",
      "format": "pg_dump_custom",
      "sha256": "$BACKUP_SHA"
    },
    "schema": {
      "path": "$SCHEMA_FILE",
      "format": "sql_schema_only",
      "sha256": "$SCHEMA_SHA"
    }
  }
}
JSON

log "Backup complete."
log "Manifest: $MANIFEST_FILE"
