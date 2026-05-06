import { describe, it } from 'vitest';
import { expectContains, expectMatches, expectNotContains, readWeb } from './sourceAssertions';

describe('launch safety: community moderation approval gate', () => {
  it('keeps analyzed submissions pending until admin approval', () => {
    const analyzer = readWeb('server/workers/submission-analyzer.js');
    expectContains(analyzer, "const componentStatus = 'pending_review'", 'component pending_review status');
    expectContains(analyzer, "const templateStatus = 'pending_review'", 'template pending_review status');
    expectContains(analyzer, "status: 'pending_review'", 'submission pending review update');
    expectNotContains(analyzer, "let componentStatus = 'active'", 'auto-active component assignment');
    expectNotContains(analyzer, "templateStatus = 'active'", 'auto-active template assignment');
  });

  it('exposes only active catalog items to the builder and bundle fetch', () => {
    const registry = readWeb('server/lib/registry/registry.js');
    expectMatches(registry, /from\('components'\)\.select\('bundle_code,status'\)\.eq\('status', 'active'\)/, 'active-only component bundle fetch');
    expectMatches(registry, /from\('templates'\)[\s\S]*?\.eq\('status', 'active'\)/, 'active-only template fetch');

    const categoryFilter = readWeb('server/lib/category-filter.js');
    expectContains(categoryFilter, ".eq('status', 'active')", 'active-only category filtering');
  });

  it('lets admins approve/reject/flag/archive/restore through the review queue', () => {
    const admin = readWeb('server/routes/admin.js');
    expectContains(admin, "router.get('/review-queue'", 'admin review queue endpoint');
    expectContains(admin, "router.post('/review-submission'", 'admin submission review endpoint');
    expectContains(admin, "router.post('/review-report'", 'admin report review endpoint');
    expectContains(admin, "router.post('/review-takedown'", 'admin takedown review endpoint');
    expectContains(admin, "decision === 'approve'", 'approval action');
    expectContains(admin, "decision === 'reject'", 'rejection action');
    expectContains(admin, "decision === 'flag'", 'flag action');
    expectContains(admin, "decision === 'archive'", 'archive action');
    expectContains(admin, "decision === 'restore'", 'restore action');
    expectContains(admin, 'logAuditEvent', 'moderation audit logging');
  });
});
