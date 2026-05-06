-- =====================================================
-- Launch Hardening D: Community moderation pipeline
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'submission_status'
        AND e.enumlabel = 'pending_review'
    ) THEN
      ALTER TYPE submission_status ADD VALUE 'pending_review';
    END IF;
  END IF;
END $$;

ALTER TABLE public.community_submissions
  ADD COLUMN IF NOT EXISTS component_id UUID REFERENCES public.components(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category_hint TEXT,
  ADD COLUMN IF NOT EXISTS ip_attestation_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS license_grant_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attestation_version TEXT,
  ADD COLUMN IF NOT EXISTS license_type TEXT DEFAULT 'MIT',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderation_metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_community_submissions_component_id
  ON public.community_submissions(component_id);

CREATE INDEX IF NOT EXISTS idx_community_submissions_review
  ON public.community_submissions(status, reviewed_at DESC);

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class r ON r.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = r.relnamespace
  WHERE n.nspname = 'public'
    AND r.relname = 'components'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.components DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.components
  ADD CONSTRAINT components_status_safe_check
  CHECK (status IN ('active', 'pending', 'pending_review', 'flagged', 'rejected', 'deprecated', 'archived'));

CREATE TABLE IF NOT EXISTS public.component_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('copyright', 'malicious', 'nsfw', 'low-quality', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'resolved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_component_reports_component_id
  ON public.component_reports(component_id);

CREATE INDEX IF NOT EXISTS idx_component_reports_status
  ON public.component_reports(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_component_reports_unique_open
  ON public.component_reports(component_id, reported_by, reason)
  WHERE status IN ('open', 'triaged');

CREATE TABLE IF NOT EXISTS public.copyright_takedown_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.community_submissions(id) ON DELETE SET NULL,
  component_id UUID REFERENCES public.components(id) ON DELETE SET NULL,
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  claim_summary TEXT NOT NULL,
  evidence JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'accepted', 'rejected', 'withdrawn')),
  handled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_takedown_component_id
  ON public.copyright_takedown_requests(component_id);

CREATE INDEX IF NOT EXISTS idx_takedown_status
  ON public.copyright_takedown_requests(status, created_at DESC);

ALTER TABLE public.community_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copyright_takedown_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submissions_select_admin" ON public.community_submissions;
CREATE POLICY "submissions_select_admin"
  ON public.community_submissions
  FOR SELECT
  USING (public.is_builder_admin());

DROP POLICY IF EXISTS "submissions_update_admin" ON public.community_submissions;
CREATE POLICY "submissions_update_admin"
  ON public.community_submissions
  FOR UPDATE
  USING (public.is_builder_admin())
  WITH CHECK (public.is_builder_admin());

DROP POLICY IF EXISTS "components_public_read_only_active" ON public.components;
CREATE POLICY "components_public_read_only_active"
  ON public.components
  FOR SELECT
  USING (
    status = 'active'
    OR author_id = auth.uid()
    OR public.is_builder_admin()
  );

DROP POLICY IF EXISTS "component_reports_insert_own" ON public.component_reports;
CREATE POLICY "component_reports_insert_own"
  ON public.component_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

DROP POLICY IF EXISTS "component_reports_select_own_or_admin" ON public.component_reports;
CREATE POLICY "component_reports_select_own_or_admin"
  ON public.component_reports
  FOR SELECT
  USING (auth.uid() = reported_by OR public.is_builder_admin());

DROP POLICY IF EXISTS "component_reports_admin_update" ON public.component_reports;
CREATE POLICY "component_reports_admin_update"
  ON public.component_reports
  FOR UPDATE
  USING (public.is_builder_admin())
  WITH CHECK (public.is_builder_admin());

DROP POLICY IF EXISTS "copyright_takedown_admin_read_write" ON public.copyright_takedown_requests;
CREATE POLICY "copyright_takedown_admin_read_write"
  ON public.copyright_takedown_requests
  FOR ALL
  USING (public.is_builder_admin())
  WITH CHECK (public.is_builder_admin());

-- Public takedown intake is handled by the server route using service_role.
