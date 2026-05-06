import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
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

const adminRoutes = 'server/routes/admin.js';
assertRegex(adminRoutes, /router\.get\('\/review-queue', requireAuth, requireBuilderAdmin/, 'admin-only review queue endpoint');
assertRegex(adminRoutes, /router\.post\('\/review-submission', requireAuth, requireBuilderAdmin/, 'admin-only submission review endpoint');
assertRegex(adminRoutes, /router\.post\('\/review-report', requireAuth, requireBuilderAdmin/, 'admin-only report review endpoint');
assertRegex(adminRoutes, /router\.post\('\/review-takedown', requireAuth, requireBuilderAdmin/, 'admin-only takedown review endpoint');
assertContains(adminRoutes, "approve') return 'active'", 'approve decision status');
assertContains(adminRoutes, "restore') return 'pending_review'", 'restore decision status');
assertContains(adminRoutes, "archive') return 'archived'", 'archive decision status');
assertContains(adminRoutes, "component_reports", 'report table in review queue');
assertContains(adminRoutes, "copyright_takedown_requests", 'takedown table in review queue');
assertContains(adminRoutes, 'ip_attestation_accepted_at', 'attestation fields in review queue');
assertContains(adminRoutes, 'logAuditEvent(req', 'audit logging for moderation actions');
assertContains(adminRoutes, 'buildStatementOfReasons', 'statement-of-reasons helper');
assertContains(adminRoutes, 'statement_of_reasons', 'statement-of-reasons persistence');

const adminPanel = 'src/pages/Agency/pages/Builder/Admin/AdminPanel.jsx';
assertContains(adminPanel, 'function ReviewQueuePanel', 'review queue panel component');
assertContains(adminPanel, "fetch('/api/admin/review-queue'", 'review queue fetch');
assertContains(adminPanel, "'/api/admin/review-submission'", 'submission review UI action');
assertContains(adminPanel, "'/api/admin/review-report'", 'report review UI action');
assertContains(adminPanel, "'/api/admin/review-takedown'", 'takedown review UI action');
assertContains(adminPanel, "activeTab === 'review'", 'review tab switch');
assertContains(adminPanel, 'IP Attested', 'attestation display');
assertContains(adminPanel, 'License Grant', 'license display');

const submitTemplate = 'server/routes/community/submit-template.js';
assertContains(submitTemplate, 'moderation_metadata', 'template moderation metadata');
assertContains(submitTemplate, 'template_id: templateRow.id', 'template id linked to submission');

console.log('[admin-review-queue-regression] OK');
