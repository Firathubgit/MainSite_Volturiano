# Publishing Direction

New publishing should be GitHub/Vercel only.

## Canonical path for new publishing

The live publish button should use `PublishToVercelModal`, `/api/integrations/github/connect`, `/api/integrations/github/push-project`, `/api/integrations/github/refresh-vercel-url`, and GitHub deployment/homepage detection for the live Vercel URL.

The UI should show the live Vercel URL when it is available and let users refresh it after GitHub/Vercel finishes deployment.

## Legacy path

The old local/Supabase Storage path is legacy:

- `/api/publish-site`
- `/sites/:slug`
- `published_sites`
- local generated folders such as `web/server/pub_sites/` and `web/server/temp_extract/`

This path is now read-only compatibility. `POST /api/publish-site` must not create or update sites; it should fail closed and point callers to GitHub/Vercel. Existing `/sites/:slug` links must stay readable until migration/retirement is safe.

## Retirement sequence

1. Ensure the builder UI only exposes GitHub/Vercel publishing.
2. Confirm first publish, update publish, and live URL refresh work through GitHub/Vercel.
3. Confirm the builder UI no longer calls `/api/publish-site`.
4. Keep `/sites/:slug` read-only for old projects during the transition.
5. Remove the `/api/publish-site` tombstone, the `/sites/:slug` proxy, `published_sites` management, and generated publish artifacts only after old links are migrated or intentionally retired.

## Artifact policy

Generated publish/temp output must not be committed. Keep runtime output in ignored folders or temporary storage.
