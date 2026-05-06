-- =====================================================
-- Publish to Vercel MVP — GitHub publishing OAuth surface
-- =====================================================
-- One row per builder user that has authorized our GitHub OAuth App for
-- repo creation/updates. The token is encrypted at the application layer
-- (AES-256-GCM via web/server/lib/security/token-crypto.js) before storage.
--
-- Adds the project-level publishing metadata columns the Generation page
-- reads from to decide between "Create GitHub repo" and "Update GitHub".

CREATE TABLE IF NOT EXISTS public.github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  github_user_id BIGINT NOT NULL,
  github_username TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  scopes TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_connections_user_id
  ON public.github_connections(user_id);

ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

-- Owners can read their own connection metadata. The encrypted token is
-- protected at the app layer; even if it leaked it requires the server-side
-- key to decrypt.
DROP POLICY IF EXISTS "github_connections_select_own" ON public.github_connections;
CREATE POLICY "github_connections_select_own"
  ON public.github_connections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Owners may delete their own row (used by the Disconnect button).
DROP POLICY IF EXISTS "github_connections_delete_own" ON public.github_connections;
CREATE POLICY "github_connections_delete_own"
  ON public.github_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Inserts and updates are service-role only — the backend writes the
-- encrypted token after the OAuth callback. The anon/authenticated roles
-- never need direct write access here.

-- ─── Project-level publish metadata ───
-- Some columns (github_repo_url, github_pushed_at) already exist on
-- public.projects from the original Builder schema (see
-- web/src/pages/Agency/pages/Builder/sql_migrations/02_projects_table.sql).
-- The IF NOT EXISTS guards make this migration idempotent across the
-- canonical and Builder-local migration trees.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS github_repo_owner TEXT,
  ADD COLUMN IF NOT EXISTS github_repo_name TEXT,
  ADD COLUMN IF NOT EXISTS github_branch TEXT,
  ADD COLUMN IF NOT EXISTS github_last_commit_sha TEXT,
  ADD COLUMN IF NOT EXISTS github_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_github_push_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vercel_import_url TEXT,
  ADD COLUMN IF NOT EXISTS publish_status TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_github_repo
  ON public.projects(github_repo_owner, github_repo_name);
