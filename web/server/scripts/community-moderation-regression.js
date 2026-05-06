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

function assertNotContains(file, needle, label = needle) {
  const source = read(file);
  if (source.includes(needle)) {
    throw new Error(`${file} still contains ${label}`);
  }
}

function assertRegex(file, regex, label = regex.toString()) {
  const source = read(file);
  if (!regex.test(source)) {
    throw new Error(`${file} does not match ${label}`);
  }
}

const migration = 'server/migrations/019_community_moderation_pipeline.sql';
assertContains(migration, 'component_reports', 'component_reports table');
assertContains(migration, 'copyright_takedown_requests', 'copyright takedown table');
assertContains(migration, 'ip_attestation_accepted_at', 'IP attestation column');
assertContains(migration, 'license_grant_accepted_at', 'license grant column');
assertContains(migration, "'pending_review'", 'pending_review component status');
assertContains(migration, "'flagged'", 'flagged component status');

const analyzer = 'server/workers/submission-analyzer.js';
assertContains(analyzer, "const componentStatus = 'pending_review'", 'pending component analyzer status');
assertContains(analyzer, "const templateStatus = 'pending_review'", 'pending template analyzer status');
assertContains(analyzer, "status: 'pending_review'", 'pending submission update');
assertContains(analyzer, 'ENABLE_COMMUNITY_AUTO_SCREENSHOTS', 'auto-screenshot explicit env gate');
assertContains(analyzer, 'SCREENSHOT_ALLOWED_HOSTS', 'screenshot worker network allowlist');
assertContains(analyzer, 'request.abort()', 'screenshot worker network blocking');
assertContains(analyzer, 'decodeDataUriMedia', 'validated media decoding');
assertNotContains(analyzer, "let componentStatus = 'active'", 'auto-active component gate');
assertNotContains(analyzer, "templateStatus = 'active'", 'auto-active template gate');

const submitComponent = 'server/routes/community/submit-component.js';
assertContains(submitComponent, 'ipAttestationAccepted', 'component IP attestation input');
assertContains(submitComponent, 'licenseGrantAccepted', 'component license grant input');
assertContains(submitComponent, 'license_grant_accepted_at', 'component license grant storage');
assertContains(submitComponent, 'parseDataUriMedia', 'component media validation');
assertNotContains(submitComponent, 'increment_reputation', 'pre-approval component reputation');

const submitTemplate = 'server/routes/community/submit-template.js';
assertContains(submitTemplate, 'ipAttestationAccepted', 'template IP attestation input');
assertContains(submitTemplate, 'licenseGrantAccepted', 'template license grant input');
assertContains(submitTemplate, 'license_grant_accepted_at', 'template license grant storage');
assertContains(submitTemplate, 'parseDataUriMedia', 'template media validation');
assertNotContains(submitTemplate, 'increment_reputation', 'pre-approval template reputation');

assertContains('server/lib/community/media-validation.js', 'MAX_BASE64_CHARS', 'media validation size guard');
assertContains('server/lib/screenshot.js', 'CHROMIUM_NO_SANDBOX', 'screenshot sandbox env gate');

const componentStudio = 'src/pages/Agency/pages/Builder/Community/ComponentStudio.jsx';
assertContains(componentStudio, 'ipAttestationAccepted: agreedToLicense', 'studio attestation payload');
assertContains(componentStudio, 'licenseGrantAccepted: agreedToLicense', 'studio license payload');

const componentSubmit = 'src/pages/Agency/pages/Builder/Community/ComponentSubmit.jsx';
assertContains(componentSubmit, 'ipAttestationAccepted: agreedToLicense', 'submit page attestation payload');
assertContains(componentSubmit, 'licenseGrantAccepted: agreedToLicense', 'submit page license payload');

const registry = 'server/lib/registry/registry.js';
assertRegex(registry, /from\('components'\)\.select\('bundle_code,status'\)\.eq\('status', 'active'\)/, 'active-only bundle fetch');
assertRegex(registry, /from\('templates'\)[\s\S]*?\.eq\('status', 'active'\)/, 'active-only template fetch');

const categoryFilter = 'server/lib/category-filter.js';
assertContains(categoryFilter, ".eq('status', 'active')", 'active-only category filter');

const communityRoutes = 'server/routes/community/index.js';
assertContains(communityRoutes, '.from(\'component_reports\')', 'component report insert');
assertContains(communityRoutes, "router.post('/takedown'", 'takedown intake route');
assertContains(communityRoutes, "filter(c => c?.status === 'active')", 'liked component active filter');
assertRegex(communityRoutes, /router\.post\('\/components\/:id\/update-media', requireAuth, requireBuilderAdmin/, 'admin media route guard');

const adminRoutes = 'server/routes/admin.js';
assertContains(adminRoutes, "router.post('/review-submission'", 'admin review endpoint');
assertContains(adminRoutes, 'syncSubmissionStatusFromComponent', 'submission review sync');

console.log('[community-moderation-regression] OK');
