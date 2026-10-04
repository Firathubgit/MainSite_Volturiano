import { describe, it } from 'vitest';
import { expectContains, expectMatches, expectNotContains, readWeb } from './sourceAssertions';

describe('launch safety: project ownership isolation', () => {
  it('keeps project write routes behind authenticated ownership helpers', () => {
    const updateProject = readWeb('server/routes/update-project.js');
    expectContains(updateProject, 'updateProjectForUser', 'safe project update helper');
    expectContains(updateProject, 'sendOwnershipError', 'normalized ownership error response');
    expectNotContains(updateProject, "updateProject(buildId", 'unsafe raw updateProject call');

    const saveSnapshot = readWeb('server/routes/save-snapshot.js');
    expectContains(saveSnapshot, 'createSnapshotForUser', 'safe snapshot create helper');
    expectContains(saveSnapshot, 'updateProjectForUser(projectId, userId', 'owned thumbnail update');

    const publish = readWeb('server/routes/publish.js');
    expectContains(publish, 'Local Supabase Storage publishing is retired', 'legacy local publish write path retired');
    expectContains(publish, 'status(410)', 'retired local publish route fails closed');

    const dashboard = readWeb('server/routes/dashboard.js');
    expectContains(dashboard, 'assertPublishedSiteOwner', 'published site ownership guard');
    expectContains(dashboard, 'assertProjectOwner', 'dashboard project ownership guard');

    const githubPublish = readWeb('server/routes/integrations/github.js');
    expectContains(githubPublish, 'assertProjectOwner(projectId, req.user.id', 'publish ownership assertion');
  });

  it('uses strict bearer auth for normal project/settings routes and query tokens only where explicitly allowed', () => {
    const auth = readWeb('server/middleware/authMiddleware.js');
    expectContains(auth, 'requireAuthAllowQueryToken', 'query-token opt-in auth');
    expectMatches(auth, /else if \(allowQueryToken && req\.query\.token\)/, 'query token fallback must be opt-in');

    const index = readWeb('server/index.js');
    expectContains(index, "app.post('/api/projects/update', requireAuth", 'project update strict auth');
    expectContains(index, "app.post('/api/snapshots', requireAuth", 'snapshot strict auth');
    expectContains(index, "app.post('/api/publish-site', requireAuth", 'publish strict auth');
    expectContains(index, "app.use('/api/settings', settingsRoutes)", 'settings routes mounted');
  });
});
