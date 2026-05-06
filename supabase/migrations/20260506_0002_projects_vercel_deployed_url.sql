-- =====================================================
-- Publish to Vercel MVP — store the user-provided live Vercel URL
-- =====================================================
-- We don't have Vercel API access (out of scope for MVP), so we let users
-- paste the deployed URL once after their first import. It then shows up
-- as a clickable link on every future open of the publish modal.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS vercel_deployed_url TEXT;
