# Backup and Restore Runbook

Purpose: make Volturiano launch-safe against accidental database loss, bad migrations, storage drift, and failed deploys.

Scope:
- Supabase/Postgres database backups
- Supabase Storage inventory manifests
- Local/dev restore drills
- Production restore decision checklist

This runbook does not replace Supabase platform backups. It gives the project an explicit, repeatable, operator-owned backup trail.

## Backup Artifacts

Database backup script:

```bash
scripts/backups/backup-db.sh --plan
SUPABASE_DB_URL="postgres://..." scripts/backups/backup-db.sh --execute
```

Outputs:
- `backups/db/volturiano-db-<timestamp>.dump`
- `backups/db/volturiano-schema-<timestamp>.sql`
- `backups/db/volturiano-db-<timestamp>.manifest.json`

Storage manifest script:

```bash
scripts/backups/backup-storage-manifest.sh --plan
SUPABASE_DB_URL="postgres://..." scripts/backups/backup-storage-manifest.sh --execute
```

Outputs:
- `backups/storage/volturiano-storage-buckets-<timestamp>.csv`
- `backups/storage/volturiano-storage-objects-<timestamp>.csv`
- `backups/storage/volturiano-storage-<timestamp>.manifest.json`

Important: the storage manifest does not contain object bytes. Database backups do not include Supabase Storage objects. Keep separate object backups for buckets such as `published-sites`, `project-thumbnails`, component previews, videos, and user-uploaded media.

Storage object copy script:

```bash
scripts/backups/backup-storage-objects.sh --plan
SUPABASE_STORAGE_RCLONE_REMOTE="volturiano-supabase" scripts/backups/backup-storage-objects.sh --execute
```

Outputs:
- `backups/storage-objects/<timestamp>/<bucket>/...`
- `backups/storage-objects/volturiano-storage-objects-<timestamp>.manifest.json`
- `backups/storage-objects/volturiano-storage-objects-<timestamp>.rclone.log`

The object copy requires an rclone remote configured against Supabase Storage S3. Recommended MVP buckets:
- `published-sites`
- `project-thumbnails`
- `component-previews`
- `builder-assets`

## Routine Schedule

Before major database migrations:
- Run `backup-db.sh --execute`.
- Run `backup-storage-manifest.sh --execute`.
- Run `backup-storage-objects.sh --execute` for buckets that contain published sites, previews, or user uploads.
- Store the output in the agreed backup location.
- Record the manifest paths in the deployment note.

Weekly during MVP:
- Run a database backup.
- Run a storage manifest.
- Run or verify the latest storage object copy.
- Verify artifact files exist and have hashes.

Monthly:
- Run a local/dev restore drill with `test-restore.sh`.
- Record the date, backup label, restore target, and result.

## Restore Drill

Use a disposable local/dev database. Never point the restore drill at production.

```bash
export LOCAL_RESTORE_DB_URL="postgres://..."
scripts/backups/test-restore.sh --execute --backup-file backups/db/volturiano-db-<timestamp>.dump
```

The drill:
- Restores through `restore-db.sh`.
- Requires explicit `RESTORE_LOCAL_DEV` confirmation internally.
- Refuses non-local targets unless `--allow-nonlocal` is deliberately passed to `restore-db.sh`.
- Verifies core tables such as `profiles`, `projects`, `components`, `published_sites`, `credit_transactions`, `agent_sessions`, `audit_logs`, and `gdpr_requests`.

## Production Restore Rules

Do not restore production directly from a terminal during normal development.

Production restore requires:
- A written incident note.
- Identified affected time window.
- Fresh backup of current production state.
- Confirmation of whether Supabase platform PITR/restore-to-new-project is the safer path.
- Separate plan for Storage objects, because DB restore does not restore bucket files.
- Human approval from the project owner.

Preferred production pattern:
1. Restore to a new Supabase project or isolated staging target.
2. Verify schema, row counts, auth dependencies, storage manifest, published-site metadata, and agent tables.
3. Decide whether to migrate selected data forward or repoint the application.
4. Keep the original production project untouched until verification is complete.

## CI Smoke

The CI smoke step only validates that backup scripts can generate plans. It does not run backups or restores.

```bash
bash scripts/backups/backup-db.sh --plan
bash scripts/backups/backup-storage-manifest.sh --plan
bash scripts/backups/backup-storage-objects.sh --plan
bash scripts/backups/restore-db.sh --plan --backup-file backups/db/example.dump
bash scripts/backups/test-restore.sh --plan
```

## Operator Checklist

- [ ] I know which database URL env var I am using.
- [ ] I have not printed secrets in logs.
- [ ] I have a DB backup and storage manifest before major migrations.
- [ ] I understand storage object bytes are separate from the DB dump.
- [ ] I tested restore into local/dev, not production.
- [ ] I recorded the backup label and restore result.
