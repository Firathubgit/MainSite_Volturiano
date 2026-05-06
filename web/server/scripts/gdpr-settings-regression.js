import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const workspaceRoot = path.resolve(repoRoot, '..');

function read(relativePath, root = repoRoot) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertContains(file, needle, label = needle, root = repoRoot) {
  const source = read(file, root);
  if (!source.includes(needle)) {
    throw new Error(`${file} is missing ${label}`);
  }
}

function assertNotContains(file, needle, label = needle, root = repoRoot) {
  const source = read(file, root);
  if (source.includes(needle)) {
    throw new Error(`${file} still contains ${label}`);
  }
}

function assertRegex(file, regex, label = regex.toString(), root = repoRoot) {
  const source = read(file, root);
  if (!regex.test(source)) {
    throw new Error(`${file} does not match ${label}`);
  }
}

const migration = 'supabase/migrations/20260503_0005_gdpr_requests_and_consents.sql';
assertContains(migration, 'CREATE TABLE IF NOT EXISTS public.consent_events', 'consent_events table', workspaceRoot);
assertContains(migration, 'CREATE TABLE IF NOT EXISTS public.gdpr_requests', 'gdpr_requests table', workspaceRoot);
assertContains(migration, 'ON DELETE SET NULL', 'retained request/consent evidence', workspaceRoot);
assertContains(migration, 'terms_accepted_at', 'terms accepted profile column', workspaceRoot);
assertContains(migration, 'privacy_accepted_at', 'privacy accepted profile column', workspaceRoot);
assertContains(migration, 'last_data_export_at', 'last export profile column', workspaceRoot);
assertContains(migration, 'deletion_requested_at', 'delete request profile column', workspaceRoot);

const settings = 'server/routes/settings.js';
assertContains(settings, 'createGdprRequest', 'GDPR request helper');
assertContains(settings, 'recordConsentEvent', 'consent event helper');
assertContains(settings, "router.post('/ensure-profile'", 'profile bootstrap endpoint');
assertContains(settings, 'profile_bootstrapped', 'profile bootstrap audit log');
assertContains(settings, 'GdprControl', 'GDPR control logging');
assertContains(settings, 'GDPR request log insert passed', 'GDPR request success log');
assertContains(settings, 'Consent event insert passed', 'consent event success log');
assertContains(settings, 'Data export table read passed', 'data export SQL success log');
assertContains(settings, "router.post('/consent'", 'server-side consent endpoint');
assertContains(settings, 'ALLOWED_CONSENT_TYPES', 'consent type allowlist');
assertContains(settings, "router.patch('/processing-restriction'", 'processing restriction endpoint');
assertContains(settings, "requestType: 'export'", 'export request log');
assertContains(settings, "requestType: 'delete'", 'delete request log');
assertContains(settings, "agent_sessions", 'agent session export/delete');
assertContains(settings, "agent_messages", 'agent message export/delete');
assertContains(settings, "agent_tool_events", 'agent tool event export/delete');
assertContains(settings, "refund_requests", 'refund request export');
assertContains(settings, 'Financial ledger is retained', 'financial ledger retention comment');
assertContains(settings, "from('credit_transactions')", 'credit transaction ledger handling');
assertNotContains(settings, "from('credit_transactions').delete()", 'destructive credit transaction delete');
assertRegex(settings, /from\('credit_transactions'\)[\s\S]*?\.update\(\{[\s\S]*?user_id: null/, 'credit transactions anonymized, not deleted');

const accountSettings = 'src/pages/Agency/pages/Builder/Dashboard/panels/AccountSettings.jsx';
assertContains(accountSettings, '/api/settings/processing-restriction', 'auditable processing restriction API');
assertContains(accountSettings, 'financial ledger evidence', 'delete/export retention note');

const authContext = 'src/contexts/BuilderAuthContext.jsx';
assertContains(authContext, 'LEGAL_CONSENT_VERSION', 'legal consent version');
assertContains(authContext, 'ensureServerProfile', 'post-auth profile bootstrap');
assertContains(authContext, '/api/settings/ensure-profile', 'profile bootstrap API call');
assertContains(authContext, 'recordLegalConsent', 'server-side legal consent recorder');
assertContains(authContext, 'terms_accepted_at', 'terms accepted auth metadata');
assertContains(authContext, 'privacy_accepted_at', 'privacy accepted auth metadata');
assertContains(authContext, "from('consent_events')", 'signup consent event');

const authPage = 'src/pages/Agency/pages/Builder/components/AuthPage.jsx';
assertContains(authPage, 'showLegalAcceptance', 'legal acceptance shown for auth methods');
assertContains(authPage, 'handleGoogleLogin', 'Google signin consent gate');
assertContains(authPage, 'handleGithubLogin', 'GitHub signin consent gate');
assertContains(authPage, 'legalPrompt', 'visible legal prompt for disabled social flow');
assertContains(authPage, 'signInWithEmail(email, { legalAccepted: true })', 'magic link consent gate');

const cookieConsent = 'src/components/CookieConsent/CookieConsent.jsx';
assertContains(cookieConsent, '/api/settings/consent', 'server-side cookie consent log');
assertContains(cookieConsent, '/builder/privacy', 'builder privacy cookie link');

const authMiddleware = 'server/middleware/authMiddleware.js';
assertContains(authMiddleware, 'PROCESSING_RESTRICTED', 'processing restriction enforcement');
assertContains(authMiddleware, 'processing_restricted', 'processing restriction profile check');

const privacy = 'src/pages/Legal/PrivacyPolicy.jsx';
assertContains(privacy, 'Builder and Agent Data', 'agent data privacy disclosure');
assertContains(privacy, 'Consent and Rights Request Data', 'rights request privacy disclosure');
assertNotContains(privacy, 'Zero Data Retention', 'unverified zero-retention claim');

const terms = 'src/pages/Legal/TermsOfService.jsx';
assertContains(terms, 'Account Data, Export, and Deletion', 'account data terms section');
assertContains(terms, 'Financial transaction records', 'financial retention terms note');
assertContains(terms, 'AI Output and Published Sites', 'AI output terms section');
assertContains(terms, 'Moderation and Takedowns', 'moderation terms section');

console.log('[gdpr-settings-regression] OK');
