import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProjectAccessGuards, OwnershipError } from '../lib/security/project-access.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
const webRoot = path.resolve(serverRoot, '..');

function makeMockClient({ rows = {}, errors = {} } = {}) {
    return {
        from(table) {
            const filters = [];
            return {
                select() {
                    return this;
                },
                eq(field, value) {
                    filters.push({ field, value });
                    return this;
                },
                maybeSingle: async () => {
                    if (errors[table]) return { data: null, error: errors[table] };
                    const tableRows = rows[table] || [];
                    const found = tableRows.find((row) => filters.every(({ field, value }) => row[field] === value));
                    return { data: found || null, error: null };
                }
            };
        }
    };
}

async function expectOwnershipError(promise, status, code) {
    try {
        await promise;
        assert.fail(`Expected OwnershipError ${status}/${code}`);
    } catch (error) {
        assert(error instanceof OwnershipError, 'error should be an OwnershipError');
        assert.equal(error.status, status);
        assert.equal(error.code, code);
    }
}

async function testGuardBehavior() {
    const client = makeMockClient({
        rows: {
            projects: [
                { id: 'project-a', user_id: 'user-a', thumbnail_url: 'thumb-a' },
                { id: 'project-b', user_id: 'user-b', thumbnail_url: 'thumb-b' }
            ],
            published_sites: [
                { id: 'site-a', user_id: 'user-a', project_id: 'project-a', slug: 'site-a' }
            ]
        }
    });
    const guards = createProjectAccessGuards(client);

    const project = await guards.assertProjectOwner('project-a', 'user-a');
    assert.equal(project.id, 'project-a');

    await expectOwnershipError(
        guards.assertProjectOwner('project-b', 'user-a'),
        403,
        'PROJECT_ACCESS_DENIED'
    );

    await expectOwnershipError(
        guards.assertProjectOwner('missing-project', 'user-a'),
        404,
        'PROJECT_NOT_FOUND'
    );

    const site = await guards.assertPublishedSiteOwner('site-a', 'user-a');
    assert.equal(site.slug, 'site-a');

    await expectOwnershipError(
        guards.assertPublishedSiteOwner('site-a', 'user-b'),
        403,
        'SITE_ACCESS_DENIED'
    );
}

function read(relativePath) {
    return fs.readFileSync(path.join(webRoot, relativePath), 'utf8');
}

function assertSourceContains(relativePath, expected) {
    const source = read(relativePath);
    assert(
        source.includes(expected),
        `${relativePath} should contain: ${expected}`
    );
}

function assertSourceNotContains(relativePath, forbidden) {
    const source = read(relativePath);
    assert(
        !source.includes(forbidden),
        `${relativePath} should not contain: ${forbidden}`
    );
}

function testRouteHardeningWiring() {
    assertSourceContains('server/middleware/authMiddleware.js', 'AuthControl');
    assertSourceContains('server/middleware/authMiddleware.js', 'Authenticated request verified');
    assertSourceContains('server/lib/security/project-access.js', 'OwnershipControl');
    assertSourceContains('server/lib/security/project-access.js', 'Project ownership check passed');
    assertSourceContains('server/lib/security/admin-access.js', 'AdminControl');
    assertSourceContains('server/lib/security/admin-access.js', 'Admin verification passed');

    assertSourceContains('server/routes/update-project.js', 'updateProjectForUser(buildId, userId, cleanUpdates)');
    assertSourceNotContains('server/routes/update-project.js', 'await updateProject(buildId, cleanUpdates)');

    assertSourceContains('server/routes/save-snapshot.js', 'createSnapshotForUser({');
    assertSourceContains('server/routes/save-snapshot.js', 'updateProjectForUser(projectId, userId');

    assertSourceContains('server/routes/publish.js', 'assertProjectOwner(buildId, userId');
    assertSourceContains('server/routes/publish.js', ".eq('user_id', userId)");
    assertSourceContains('server/routes/publish.js', 'updateProjectForUser(buildId, userId');

    assertSourceContains('server/routes/dashboard.js', 'assertPublishedSiteOwner(siteId, userId');
    assertSourceContains('server/routes/dashboard.js', 'updateProjectForUser(site.project_id, userId');

    assertSourceContains('server/middleware/authMiddleware.js', 'allowQueryToken && req.query.token');
}

function testMigrationShape() {
    const migration = read('server/migrations/016_core_access_model_hardening.sql');
    assert(migration.includes('DROP POLICY IF EXISTS "Public profile fields are readable"'));
    assert(migration.includes('CREATE OR REPLACE VIEW public.public_profile_summaries'));
    assert(migration.includes('REVOKE UPDATE ON public.profiles FROM anon, authenticated'));
    assert(migration.includes('public.is_builder_admin()'));
    assert(migration.includes('published_sites_public_active_or_owner'));
    assert(migration.includes('credit_transactions_select_own_or_admin'));
}

await testGuardBehavior();
testRouteHardeningWiring();
testMigrationShape();

console.log('[core-access-regression] All checks passed');
