-- Mirror of supabase/migrations/20260506_0002_projects_vercel_deployed_url.sql

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS vercel_deployed_url TEXT;
