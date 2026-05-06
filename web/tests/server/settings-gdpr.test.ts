import { describe, it } from 'vitest';
import { expectContains, expectMatches, expectNotContains, readWeb, readWorkspace } from './sourceAssertions';

describe('launch safety: account export/delete GDPR scope', () => {
  it('logs data exports/deletes and exports only user-scoped datasets', () => {
    const settings = readWeb('server/routes/settings.js');
    expectContains(settings, "router.get('/export-data', requireAuth", 'authenticated export endpoint');
    expectContains(settings, "requestType: 'export'", 'export GDPR request log');
    expectContains(settings, "requestType: 'delete'", 'delete GDPR request log');
    expectContains(settings, 'account_data_exported', 'export audit event');
    expectContains(settings, 'account_delete_completed', 'delete audit event');

    const userScopedTables = [
      'projects',
      'published_sites',
      'snapshots',
      'credit_transactions',
      'refund_requests',
      'community_submissions',
      'platform_feedback',
      'platform_issues',
      'agent_sessions',
      'agent_turns',
      'agent_memory',
      'consent_events',
      'gdpr_requests'
    ];

    for (const table of userScopedTables) {
      expectContains(settings, `selectEq('${table}', 'user_id', userId)`, `${table} user-scoped export`);
    }

    expectContains(settings, "selectEq('components', 'author_id', userId)", 'authored component export');
    expectContains(settings, "selectEq('templates', 'author_id', userId)", 'authored template export');
  });

  it('preserves financial ledger rows by anonymizing instead of deleting credit transactions', () => {
    const settings = readWeb('server/routes/settings.js');
    expectContains(settings, 'Financial ledger is retained', 'ledger retention comment');
    expectMatches(settings, /from\('credit_transactions'\)[\s\S]*?\.update\(\{[\s\S]*?user_id: null/, 'credit transactions anonymized');
    expectNotContains(settings, "from('credit_transactions').delete()", 'destructive credit transaction delete');
  });

  it('has DB schema support for consent and GDPR request evidence', () => {
    const migration = readWorkspace('supabase/migrations/20260503_0005_gdpr_requests_and_consents.sql');
    expectContains(migration, 'CREATE TABLE IF NOT EXISTS public.consent_events', 'consent_events migration');
    expectContains(migration, 'CREATE TABLE IF NOT EXISTS public.gdpr_requests', 'gdpr_requests migration');
    expectContains(migration, 'terms_accepted_at', 'terms accepted profile column');
    expectContains(migration, 'privacy_accepted_at', 'privacy accepted profile column');
    expectContains(migration, 'deletion_requested_at', 'delete request profile column');
  });
});
