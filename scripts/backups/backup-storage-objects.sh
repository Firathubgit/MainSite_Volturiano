#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="$ROOT_DIR/backups/storage-objects"
LABEL="$(date -u +"%Y%m%dT%H%M%SZ")"
RCLONE_REMOTE_ENV="SUPABASE_STORAGE_RCLONE_REMOTE"
BUCKETS_ENV="SUPABASE_STORAGE_BACKUP_BUCKETS"
EXECUTE=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/backups/backup-storage-objects.sh [--plan] [--execute] [--out-dir DIR] [--label LABEL] [--remote-env ENV] [--buckets-env ENV]

Copies Supabase Storage object bytes with rclone. Safe-by-default: --plan only unless --execute is passed.

Required for --execute:
  - rclone on PATH
  - SUPABASE_STORAGE_RCLONE_REMOTE configured, for example "volturiano-supabase"
  - SUPABASE_STORAGE_BACKUP_BUCKETS comma list, for example "published-sites,project-thumbnails,component-previews"

Examples:
  scripts/backups/backup-storage-objects.sh --plan
  SUPABASE_STORAGE_RCLONE_REMOTE="volturiano-supabase" scripts/backups/backup-storage-objects.sh --execute
USAGE
}

log() {
  printf '[storage-objects] %s\n' "$*"
}

die() {
  printf '[storage-objects] ERROR: %s\n' "$*" >&2
  exit 1
}

hash_manifest() {
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
    --remote-env)
      RCLONE_REMOTE_ENV="$2"
      shift 2
      ;;
    --buckets-env)
      BUCKETS_ENV="$2"
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

DEFAULT_BUCKETS="published-sites,project-thumbnails,component-previews,builder-assets"
BUCKETS_VALUE="${!BUCKETS_ENV:-$DEFAULT_BUCKETS}"
MANIFEST_FILE="$OUT_DIR/volturiano-storage-objects-$LABEL.manifest.json"
LOG_FILE="$OUT_DIR/volturiano-storage-objects-$LABEL.rclone.log"

log "Mode: $([[ "$EXECUTE" -eq 1 ]] && printf execute || printf plan)"
log "Output directory: $OUT_DIR"
log "Manifest file: $MANIFEST_FILE"
log "rclone remote env: $RCLONE_REMOTE_ENV"
log "Buckets env: $BUCKETS_ENV"
log "Buckets: $BUCKETS_VALUE"

if [[ "$EXECUTE" -ne 1 ]]; then
  cat <<PLAN

Plan only. To copy Supabase Storage object bytes:
  export $RCLONE_REMOTE_ENV="<configured rclone remote for Supabase S3>"
  export $BUCKETS_ENV="$BUCKETS_VALUE"
  scripts/backups/backup-storage-objects.sh --execute --out-dir "$OUT_DIR" --label "$LABEL"

Commands that will run for each bucket:
  rclone copy "\$$RCLONE_REMOTE_ENV:<bucket>" "$OUT_DIR/$LABEL/<bucket>" --create-empty-src-dirs --checksum --metadata --log-file "$LOG_FILE"
PLAN
  exit 0
fi

RCLONE_REMOTE="${!RCLONE_REMOTE_ENV:-}"
[[ -n "$RCLONE_REMOTE" ]] || die "$RCLONE_REMOTE_ENV is not set"
command -v rclone >/dev/null 2>&1 || die "rclone is not installed or not on PATH"

mkdir -p "$OUT_DIR/$LABEL"
IFS=',' read -ra BUCKETS <<< "$BUCKETS_VALUE"

COPIED_JSON=""
for raw_bucket in "${BUCKETS[@]}"; do
  bucket="$(echo "$raw_bucket" | xargs)"
  [[ -n "$bucket" ]] || continue
  target="$OUT_DIR/$LABEL/$bucket"
  log "Copying bucket $bucket to $target"
  rclone copy "$RCLONE_REMOTE:$bucket" "$target" \
    --create-empty-src-dirs \
    --checksum \
    --metadata \
    --log-file "$LOG_FILE"
  COPIED_JSON="$COPIED_JSON
    { \"bucket\": \"$bucket\", \"path\": \"$target\" },"
done

LOG_SHA="$(hash_manifest "$LOG_FILE")"
cat > "$MANIFEST_FILE" <<JSON
{
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "label": "$LABEL",
  "remote_env": "$RCLONE_REMOTE_ENV",
  "buckets_env": "$BUCKETS_ENV",
  "log_file": "$LOG_FILE",
  "log_sha256": "$LOG_SHA",
  "copied": [
${COPIED_JSON%,}
  ]
}
JSON

log "Storage object backup complete."
log "Manifest: $MANIFEST_FILE"
