import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(__filename), '..', '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

function assertContains(file, needle, label = needle) {
  const source = read(file);
  if (!source.includes(needle)) {
    throw new Error(`${file} is missing ${label}`);
  }
}

function assertRegex(file, regex, label = regex.toString()) {
  const source = read(file);
  if (!regex.test(source)) {
    throw new Error(`${file} does not match ${label}`);
  }
}

function assertScriptSafety(file) {
  assertContains(file, '#!/usr/bin/env bash', 'bash shebang');
  assertContains(file, 'set -Eeuo pipefail', 'strict bash mode');
  assertContains(file, 'EXECUTE=0', 'plan-first default');
  assertContains(file, '--plan', 'plan mode flag');
  assertContains(file, '--execute', 'execute mode flag');
  assertContains(file, 'usage()', 'usage output');
}

assertScriptSafety('scripts/backups/backup-db.sh');
assertContains('scripts/backups/backup-db.sh', 'pg_dump', 'pg_dump backup command');
assertContains('scripts/backups/backup-db.sh', 'SUPABASE_DB_URL', 'database URL env default');
assertContains('scripts/backups/backup-db.sh', 'sha256', 'backup hash manifest');
assertRegex('scripts/backups/backup-db.sh', /if \[\[ "\$EXECUTE" -ne 1 \]\]; then[\s\S]*Plan only/, 'backup dry-run guard');

assertScriptSafety('scripts/backups/backup-storage-manifest.sh');
assertContains('scripts/backups/backup-storage-manifest.sh', 'storage.buckets', 'bucket inventory query');
assertContains('scripts/backups/backup-storage-manifest.sh', 'storage.objects', 'object inventory query');
assertContains('scripts/backups/backup-storage-manifest.sh', 'does not download object bytes', 'storage byte warning');

assertScriptSafety('scripts/backups/backup-storage-objects.sh');
assertContains('scripts/backups/backup-storage-objects.sh', 'SUPABASE_STORAGE_RCLONE_REMOTE', 'storage object remote env');
assertContains('scripts/backups/backup-storage-objects.sh', 'rclone copy', 'storage object copy command');
assertContains('scripts/backups/backup-storage-objects.sh', 'published-sites', 'published sites bucket default');
assertContains('scripts/backups/backup-storage-objects.sh', 'preview', 'preview bucket default');

assertScriptSafety('scripts/backups/restore-db.sh');
assertContains('scripts/backups/restore-db.sh', 'RESTORE_LOCAL_DEV', 'explicit restore confirmation');
assertContains('scripts/backups/restore-db.sh', '--allow-nonlocal', 'non-local restore override');
assertContains('scripts/backups/restore-db.sh', 'pg_restore --clean --if-exists', 'clean custom restore');
assertContains('scripts/backups/restore-db.sh', 'Target database URL does not look local/dev', 'local target guard');

assertScriptSafety('scripts/backups/test-restore.sh');
assertContains('scripts/backups/test-restore.sh', 'restore-db.sh', 'restore drill delegation');
assertContains('scripts/backups/test-restore.sh', 'REQUIRED_TABLES', 'core table verification');
assertContains('scripts/backups/test-restore.sh', 'gdpr_requests', 'GDPR table verification');

assertContains('docs/ops/backup-restore-runbook.md', 'Database backups do not include Supabase Storage objects', 'storage restore warning');
assertContains('docs/ops/backup-restore-runbook.md', 'backup-storage-objects.sh', 'storage object backup docs');
assertContains('docs/ops/backup-restore-runbook.md', 'Production restore requires', 'production restore checklist');
assertContains('docs/ops/backup-restore-runbook.md', 'CI smoke', 'CI smoke docs');
assertContains('docs/development/dev-loop-guide.md', 'backup-db.sh --plan', 'dev guide DB backup note');
assertContains('docs/development/dev-loop-guide.md', 'backup-storage-manifest.sh --plan', 'dev guide storage backup note');
assertContains('docs/development/dev-loop-guide.md', 'backup-storage-objects.sh --plan', 'dev guide storage object backup note');

assertContains('.github/workflows/ci.yml', 'Backup scripts smoke plan', 'CI backup smoke step');
assertContains('.github/workflows/ci.yml', 'bash scripts/backups/backup-db.sh --plan', 'CI DB plan');
assertContains('.github/workflows/ci.yml', 'bash scripts/backups/backup-storage-objects.sh --plan', 'CI storage object plan');
assertContains('.github/workflows/ci.yml', 'bash scripts/backups/test-restore.sh --plan', 'CI restore drill plan');

console.log('[backup-ops-regression] OK');
