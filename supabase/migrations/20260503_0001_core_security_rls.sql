-- =====================================================
-- Core Access Model Hardening
-- Project ownership, safe public profiles, admin helper
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_builder_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.admin_role FROM public.profiles p WHERE p.id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_builder_admin() TO anon, authenticated;

-- Public profile access should go through a narrow view, not the raw profiles table.
DROP POLICY IF EXISTS "Public profile fields are readable" ON public.profiles;

CREATE OR REPLACE VIEW public.public_profile_summaries
WITH (security_barrier = true)
AS
SELECT
  id,
  display_name,
  username,
  avatar_url,
  bio,
  location,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profile_summaries TO anon, authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_issues ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_builder_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS decides which row can be updated; column grants decide which fields.
-- Do not let the browser client promote billing/admin/security fields.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (
  display_name,
  full_name,
  username,
  bio,
  avatar_url,
  website_url,
  location,
  role,
  preferred_theme,
  onboarding_completed,
  preferred_mode,
  gdpr_consent_at,
  processing_restricted,
  has_received_bonus_popup,
  updated_at
) ON public.profiles TO authenticated;

-- projects
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "projects_select_own_or_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own_or_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own_or_admin" ON public.projects;

CREATE POLICY "projects_select_own_or_admin"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id OR public.is_builder_admin());

CREATE POLICY "projects_insert_own"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_own_or_admin"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id OR public.is_builder_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_builder_admin());

CREATE POLICY "projects_delete_own_or_admin"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id OR public.is_builder_admin());

-- snapshots
DROP POLICY IF EXISTS "Users can manage own snapshots" ON public.snapshots;
DROP POLICY IF EXISTS "snapshots_manage_own_or_admin" ON public.snapshots;
CREATE POLICY "snapshots_manage_own_or_admin"
  ON public.snapshots FOR ALL
  USING (auth.uid() = user_id OR public.is_builder_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_builder_admin());

-- published_sites
DROP POLICY IF EXISTS "Published sites are publicly readable" ON public.published_sites;
DROP POLICY IF EXISTS "Users can manage own published sites" ON public.published_sites;
DROP POLICY IF EXISTS "published_sites_public_active_or_owner" ON public.published_sites;
DROP POLICY IF EXISTS "published_sites_manage_own_or_admin" ON public.published_sites;

CREATE POLICY "published_sites_public_active_or_owner"
  ON public.published_sites FOR SELECT
  USING (status = 'active' OR auth.uid() = user_id OR public.is_builder_admin());

CREATE POLICY "published_sites_manage_own_or_admin"
  ON public.published_sites FOR ALL
  USING (auth.uid() = user_id OR public.is_builder_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_builder_admin());

-- credit_transactions remain server-written; clients can only read their own ledger rows.
DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "credit_transactions_select_own_or_admin" ON public.credit_transactions;
CREATE POLICY "credit_transactions_select_own_or_admin"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_builder_admin());

-- feedback/issues
DROP POLICY IF EXISTS "platform_feedback_insert_own" ON public.platform_feedback;
DROP POLICY IF EXISTS "platform_feedback_select_own_or_admin" ON public.platform_feedback;
CREATE POLICY "platform_feedback_insert_own"
  ON public.platform_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "platform_feedback_select_own_or_admin"
  ON public.platform_feedback FOR SELECT
  USING (auth.uid() = user_id OR public.is_builder_admin());

DROP POLICY IF EXISTS "platform_issues_insert_own" ON public.platform_issues;
DROP POLICY IF EXISTS "platform_issues_select_own_or_admin" ON public.platform_issues;
CREATE POLICY "platform_issues_insert_own"
  ON public.platform_issues FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "platform_issues_select_own_or_admin"
  ON public.platform_issues FOR SELECT
  USING (auth.uid() = user_id OR public.is_builder_admin());

-- If older community policies exist, standardize their admin check on admin_role.
DROP POLICY IF EXISTS "submissions_select_admin" ON public.community_submissions;
CREATE POLICY "submissions_select_admin"
  ON public.community_submissions FOR SELECT
  USING (public.is_builder_admin());

DROP POLICY IF EXISTS "submissions_update_admin" ON public.community_submissions;
CREATE POLICY "submissions_update_admin"
  ON public.community_submissions FOR UPDATE
  USING (public.is_builder_admin())
  WITH CHECK (public.is_builder_admin());
