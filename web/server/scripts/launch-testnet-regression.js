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

const packageJson = 'web/package.json';
assertContains(packageJson, '"test:unit": "vitest run"', 'unit test script');
assertContains(packageJson, '"test:server": "vitest run tests/server"', 'server test script');
assertContains(packageJson, '"test:e2e": "playwright test"', 'e2e test script');
assertContains(packageJson, '"test:ci":', 'CI test script');
assertContains(packageJson, '"test:staging-smoke":', 'staging smoke plan script');
assertContains(packageJson, '"vitest"', 'Vitest dev dependency');
assertContains(packageJson, '"@playwright/test"', 'Playwright dev dependency');

assertContains('web/vitest.config.ts', "include: ['tests/server/**/*.test.{js,ts}']", 'server test include');
assertContains('web/vitest.config.ts', "environment: 'node'", 'node test environment');
assertContains('web/playwright.config.ts', "testDir: './e2e'", 'Playwright e2e dir');
assertContains('web/playwright.config.ts', 'webServer:', 'Playwright local web server');
assertContains('web/playwright.config.ts', "trace: 'retain-on-failure'", 'Playwright trace retention');

assertContains('web/tests/server/auth-isolation.test.ts', 'updateProjectForUser', 'project isolation assertion');
assertContains('web/tests/server/auth-isolation.test.ts', 'assertProjectOwner(projectId, req.user.id', 'publish ownership assertion');
assertContains('web/tests/server/stripe-webhooks.test.ts', 'stripe_webhook_events', 'Stripe ledger assertion');
assertContains('web/tests/server/stripe-webhooks.test.ts', 'reserveStripeEvent', 'Stripe idempotency assertion');
assertContains('web/tests/server/community-approval.test.ts', "const componentStatus = 'pending_review'", 'community pending assertion');
assertContains('web/tests/server/community-approval.test.ts', "router.post('/review-submission'", 'admin approval assertion');
assertContains('web/tests/server/settings-gdpr.test.ts', "requestType: 'export'", 'GDPR export assertion');
assertContains('web/tests/server/settings-gdpr.test.ts', "from('credit_transactions').delete()", 'negative ledger delete assertion');
assertContains('web/e2e/launch-smoke.spec.ts', '/builder/privacy', 'privacy e2e smoke');
assertContains('web/e2e/launch-smoke.spec.ts', '/builder/terms', 'terms e2e smoke');
assertContains('web/e2e/launch-smoke.spec.ts', '/builder/login', 'builder login e2e smoke');

const canonicalMigrations = [
  'supabase/migrations/20260503_0001_core_security_rls.sql',
  'supabase/migrations/20260503_0002_agent_audit_retention.sql',
  'supabase/migrations/20260503_0003_stripe_event_ledger_refunds.sql',
  'supabase/migrations/20260503_0004_community_review_and_takedowns.sql',
  'supabase/migrations/20260503_0005_gdpr_requests_and_consents.sql'
];

for (const migration of canonicalMigrations) {
  if (!fs.existsSync(path.join(workspaceRoot, migration))) {
    throw new Error(`${migration} is missing canonical launch migration`);
  }
}

assertContains('web/src/app/App.jsx', '/builder/acceptable-use', 'Acceptable Use route');
assertContains('web/src/app/App.jsx', '/builder/dpa', 'DPA route');
assertContains('web/src/app/App.jsx', '/builder/subprocessors', 'Subprocessor route');
assertContains('web/src/app/App.jsx', '/builder/takedown', 'Takedown route');
assertContains('web/src/app/App.jsx', '/builder/refunds', 'Refund policy route');
assertContains('web/src/app/App.jsx', '/builder/customer-responsibilities', 'Customer responsibility route');
assertContains('web/src/app/App.jsx', 'RequireBuilderAdmin', 'frontend admin route guard');

assertContains('web/src/pages/Agency/pages/Builder/components/AuthPage.jsx', 'agreedToTerms', 'OAuth and magic-link consent gate');
assertContains('web/src/contexts/BuilderAuthContext.jsx', 'recordLegalConsent', 'server-side auth consent recorder');
assertContains('web/src/components/CookieConsent/CookieConsent.jsx', '/api/settings/consent', 'server-side cookie consent recorder');
assertContains('web/src/components/CookieConsent/CookieConsent.jsx', '/builder/privacy', 'builder privacy cookie link');

assertContains('web/server/index.js', 'app.disable(\'x-powered-by\')', 'backend powered-by suppression');
assertContains('web/server/index.js', 'X-Request-Id', 'request id response header');
assertContains('web/server/index.js', 'Security headers', 'backend security headers');
assertContains('web/server/index.js', 'CORS_ORIGIN is required in production', 'production CORS fail-closed');
assertContains('web/server/index.js', 'heavyJsonRoutes', 'per-route body limits');
assertContains('web/server/index.js', 'communitySubmitLimiter', 'community submit rate limiter');
assertContains('web/server/index.js', 'publicNoticeLimiter', 'public notice rate limiter');
assertContains('web/server/index.js', 'logLaunchReadinessChecks', 'startup DB readiness logging');
assertContains('web/server/lib/launch-readiness.js', 'LaunchReadiness', 'launch readiness logger');
assertContains('web/server/lib/launch-readiness.js', 'public_profile_summaries', 'profile view readiness check');
assertContains('web/server/lib/launch-readiness.js', 'stripe_webhook_events', 'Stripe ledger readiness check');
assertContains('web/server/lib/launch-readiness.js', 'consent_events', 'consent table readiness check');

assertContains('web/server/workers/submission-analyzer.js', 'ENABLE_COMMUNITY_AUTO_SCREENSHOTS', 'community auto-render env gate');
assertContains('web/server/workers/submission-analyzer.js', 'SCREENSHOT_ALLOWED_HOSTS', 'screenshot worker network allowlist');
assertContains('web/server/workers/submission-analyzer.js', 'request.abort()', 'screenshot worker network blocking');
assertContains('web/server/lib/screenshot.js', 'CHROMIUM_NO_SANDBOX', 'Chromium no-sandbox env gate');
assertContains('web/server/lib/community/media-validation.js', 'parseDataUriMedia', 'community media validation helper');

assertContains('docs/checklists/launch-checklist.md', 'Guarded Public MVP Release Gate', 'upgraded launch checklist');
assertContains('docs/env/ci-secrets.md', 'GitHub CI Secrets Checklist', 'CI secrets checklist');
assertContains('docs/ops/production-env-audit.md', 'Production Environment Audit', 'production env audit doc');
assertContains('docs/ops/staging-smoke.md', 'Staging Smoke', 'staging smoke doc');
assertContains('docs/legal/review-packet.md', 'Manual Review Packet', 'accountant/lawyer packet doc');
assertContains('docs/vendors/evidence-index.md', 'Vendor Evidence Index', 'vendor evidence doc');
assertContains('docs/ai/governance-light.md', 'AI Governance Light', 'AI governance doc');
assertContains('web/server/scripts/staging-launch-smoke.js', 'STAGING_BASE_URL', 'staging smoke base URL');
assertContains('web/server/scripts/staging-launch-smoke.js', '/builder/takedown', 'staging smoke legal/takedown route');
assertContains('web/server/scripts/staging-launch-smoke.js', 'docs/ops/staging-smoke.md', 'staging smoke manual checklist pointer');

const ci = '.github/workflows/ci.yml';
assertContains(ci, 'Install web dependencies', 'web dependency install');
assertContains(ci, 'Install server dependencies', 'server dependency install');
assertContains(ci, 'Backup scripts smoke plan', 'backup smoke step');
assertContains(ci, 'Build frontend', 'build step');
assertContains(ci, 'Run launch safety tests', 'test:ci step');
assertContains(ci, 'Install Playwright browsers', 'Playwright browser install');
assertContains(ci, 'Run Playwright smoke tests', 'Playwright run step');
assertContains(ci, 'Upload Playwright artifacts', 'Playwright artifact upload');
assertRegex(ci, /branches: \[main, develop\]/, 'main/develop branch filter');

console.log('[launch-testnet-regression] OK');
