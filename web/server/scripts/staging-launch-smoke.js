const REQUIRED_ENV = [
  'STAGING_BASE_URL',
  'STAGING_USER_EMAIL',
  'STAGING_USER_PASSWORD',
  'STAGING_SECOND_USER_EMAIL',
  'STAGING_SECOND_USER_PASSWORD',
  'STAGING_ADMIN_EMAIL',
  'STAGING_ADMIN_PASSWORD'
];

const PUBLIC_PATHS = [
  '/builder/terms',
  '/builder/privacy',
  '/builder/acceptable-use',
  '/builder/dpa',
  '/builder/subprocessors',
  '/builder/takedown',
  '/builder/refunds',
  '/builder/customer-responsibilities',
  '/builder/security'
];

const args = new Set(process.argv.slice(2));
const execute = args.has('--execute');

function log(message) {
  console.log(`[staging-launch-smoke] ${message}`);
}

function missingEnv() {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}

async function checkPublicPages(baseUrl) {
  for (const pathname of PUBLIC_PATHS) {
    const url = new URL(pathname, baseUrl);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${pathname} returned ${response.status}`);
    }
    log(`OK ${pathname}`);
  }
}

if (!execute) {
  log('Plan mode. No staging requests were made.');
  console.log(`
Execute with:
  STAGING_BASE_URL="https://staging.example.com" \\
  STAGING_USER_EMAIL="..." STAGING_USER_PASSWORD="..." \\
  STAGING_SECOND_USER_EMAIL="..." STAGING_SECOND_USER_PASSWORD="..." \\
  STAGING_ADMIN_EMAIL="..." STAGING_ADMIN_PASSWORD="..." \\
  node server/scripts/staging-launch-smoke.js --execute

Manual checks still required after the public route smoke:
  - User A cannot access User B projects/snapshots/published sites.
  - OAuth and magic-link require Terms/Privacy acceptance.
  - Community submission remains pending_review until admin approval.
  - Stripe duplicate webhook replay does not double-grant credits.
  - Export/delete produce gdpr_requests and audit evidence.
  - DB + storage restore drill has a recorded timestamp.
`);
  process.exit(0);
}

const missing = missingEnv();
if (missing.length > 0) {
  throw new Error(`Missing required staging env vars: ${missing.join(', ')}`);
}

const baseUrl = process.env.STAGING_BASE_URL;
await checkPublicPages(baseUrl);

log('Public launch pages are reachable. Continue the authenticated manual smoke in docs/ops/staging-smoke.md.');
