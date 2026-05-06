#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT_DIR/backups/storage"
DB_URL_ENV="SUPABASE_DB_URL"
LABEL="$(date -u +"%Y%m%dT%H%M%SZ")"
EXECUTE=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/backups/backup-storage-manifest.sh [--plan] [--execute] [--out-dir DIR] [--label LABEL] [--db-url-env ENV_NAME]

Creates a Supabase Storage inventory manifest from storage.buckets and storage.objects.

Important:
  - This does not download object bytes.
  - It records bucket/object names and metadata so storage backups can be verified.
  - Database backups do not include Supabase Storage objects, so keep this manifest beside object backups.

Required for --execute:
  - psql on PATH
  - SUPABASE_DB_URL or the env name passed with --db-url-env

Examples:
  scripts/backups/backup-storage-manifest.sh --plan
  SUPABASE_DB_URL="postgres://..." scripts/backups/backup-storage-manifest.sh --execute
USAGE
}

log() {
  printf '[storage-manifest] %s\n' "$*"
}

die() {
  printf '[storage-manifest] ERROR: %s\n' "$*" >&2
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

BUCKETS_FILE="$OUT_DIR/volturiano-storage-buckets-$LABEL.csv"
OBJECTS_FILE="$OUT_DIR/volturiano-storage-objects-$LABEL.csv"
MANIFEST_FILE="$OUT_DIR/volturiano-storage-$LABEL.manifest.json"

log "Mode: $([[ "$EXECUTE" -eq 1 ]] && printf execute || printf plan)"
log "Output directory: $OUT_DIR"
log "Buckets CSV: $BUCKETS_FILE"
log "Objects CSV: $OBJECTS_FILE"
log "Manifest file: $MANIFEST_FILE"
log "Database URL env: $DB_URL_ENV"

if [[ "$EXECUTE" -ne 1 ]]; then
  cat <<PLAN

Plan only. To run the manifest export:
  export $DB_URL_ENV="<Supabase pooled or direct database URL>"
  scripts/backups/backup-storage-manifest.sh --execute --out-dir "$OUT_DIR" --label "$LABEL" --db-url-env "$DB_URL_ENV"

Commands that will run:
  psql "\$$DB_URL_ENV" --csv -c "select id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at from storage.buckets order by id"
  psql "\$$DB_URL_ENV" --csv -c "select bucket_id, name, owner, metadata, created_at, updated_at, last_accessed_at from storage.objects order by bucket_id, name"
PLAN
  exit 0
fi

DB_URL="${!DB_URL_ENV:-}"
[[ -n "$DB_URL" ]] || die "$DB_URL_ENV is not set"
command -v psql >/dev/null 2>&1 || die "psql is not installed or not on PATH"

mkdir -p "$OUT_DIR"

log "Exporting storage bucket inventory..."
psql "$DB_URL" -v ON_ERROR_STOP=1 --csv \
  -c "select id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at from storage.buckets order by id" \
  > "$BUCKETS_FILE"

log "Exporting storage object inventory..."
psql "$DB_URL" -v ON_ERROR_STOP=1 --csv \
  -c "select bucket_id, name, owner, metadata, created_at, updated_at, last_accessed_at from storage.objects order by bucket_id, name" \
  > "$OBJECTS_FILE"

BUCKETS_SHA="$(hash_file "$BUCKETS_FILE")"
OBJECTS_SHA="$(hash_file "$OBJECTS_FILE")"

cat > "$MANIFEST_FILE" <<JSON
{
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "label": "$LABEL",
  "database_url_env": "$DB_URL_ENV",
  "note": "This manifest inventories Supabase Storage metadata only. It does not contain object bytes.",
  "files": {
    "buckets": {
      "path": "$BUCKETS_FILE",
      "sha256": "$BUCKETS_SHA"
    },
    "objects": {
      "path": "$OBJECTS_FILE",
      "sha256": "$OBJECTS_SHA"
    }
  }
}
JSON

log "Storage manifest complete."
log "Manifest: $MANIFEST_FILE"
