import { describe, it } from 'vitest';
import { expectContains, expectNotContains, readWeb, readWorkspace } from './sourceAssertions';

describe('launch UX: unfinished project rows stay hidden', () => {
  it('creates early project rows as uncommitted and only commits after snapshot save', () => {
    const projectDb = readWeb('server/lib/db/projects.js');
    expectContains(projectDb, 'is_committed: false', 'new projects start hidden');
    expectContains(projectDb, 'committed_at: null', 'new projects start without commit timestamp');

    const generation = readWeb('src/pages/Agency/pages/Builder/Generation/Generation.jsx');
    expectContains(generation, 'is_committed: true', 'successful snapshot commits project visibility');
    expectContains(generation, 'committed_at: new Date().toISOString()', 'commit timestamp is set at completion');
  });

  it('filters dashboard projects and removes the visible generating placeholder copy', () => {
    const dashboard = readWeb('server/routes/dashboard.js');
    expectContains(dashboard, 'isVisibleDashboardProject', 'dashboard visibility helper');
    expectContains(dashboard, '.filter(isVisibleDashboardProject)', 'dashboard hides uncommitted projects');

    const websitesTab = readWeb('src/pages/Agency/pages/Builder/Dashboard/panels/WebsitesTab.jsx');
    expectNotContains(websitesTab, 'Generating Site...', 'unfinished placeholder copy');
  });

  it('ships the project visibility migration in both migration ledgers', () => {
    const canonicalMigration = readWorkspace('supabase/migrations/20260514_0001_project_commit_visibility.sql');
    expectContains(canonicalMigration, 'ADD COLUMN IF NOT EXISTS is_committed', 'canonical committed flag');
    expectContains(canonicalMigration, 'idx_projects_user_committed_updated', 'canonical committed index');

    const serverMigration = readWorkspace('web/server/migrations/022_project_commit_visibility.sql');
    expectContains(serverMigration, 'ADD COLUMN IF NOT EXISTS is_committed', 'server migration committed flag');
    expectContains(serverMigration, 'idx_projects_user_committed_updated', 'server migration committed index');
  });
});
