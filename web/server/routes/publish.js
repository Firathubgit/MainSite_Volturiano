/**
 * POST /api/publish-site
 *
 * BUILDER-COMPAT: Local Supabase Storage publishing is retired.
 * Existing `/sites/:slug` links are still served read-only from index.js until
 * those projects are migrated or intentionally expired. New publishes must use
 * the GitHub/Vercel flow in routes/integrations/github.js.
 */
export default async function retiredLocalPublish(_req, res) {
  return res.status(410).json({
    success: false,
    error: 'Local publishing is retired. Use GitHub/Vercel publishing for new publishes.'
  });
}
