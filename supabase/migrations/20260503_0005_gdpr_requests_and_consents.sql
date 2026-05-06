-- =====================================================
-- Launch Hardening F: GDPR requests + consent evidence
-- =====================================================

CREATE TABLE IF NOT EXISTS public.consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL CHECK (
    consent_type IN (
      'terms',
      'privacy',
      'cookies_analytics',
      'community_license',
      'ip_attestation',
      'processing_restriction'
    )
  ),
  consent_version TEXT NOT NULL,
  accepted BOOLEAN NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  retention_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_events_user_id
  ON public.consent_events(user_id);

CREATE INDEX IF NOT EXISTS idx_consent_events_type_created_at
  ON public.consent_events(consent_type, created_at DESC);

ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consent_events_select_own_or_admin" ON public.consent_events;
CREATE POLICY "consent_events_select_own_or_admin"
  ON public.consent_events
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_builder_admin());

DROP POLICY IF EXISTS "consent_events_insert_own_or_admin" ON public.consent_events;
CREATE POLICY "consent_events_insert_own_or_admin"
  ON public.consent_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_builder_admin());

DROP POLICY IF EXISTS "consent_events_admin_update" ON public.consent_events;
CREATE POLICY "consent_events_admin_update"
  ON public.consent_events
  FOR UPDATE
  USING (public.is_builder_admin())
  WITH CHECK (public.is_builder_admin());

CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (
    request_type IN (
      'export',
      'delete',
      'restrict_processing',
      'withdraw_consent'
    )
  ),
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'processing', 'completed', 'rejected', 'cancelled')
  ),
  requested_via TEXT DEFAULT 'dashboard',
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  fulfilled_at TIMESTAMPTZ,
  retention_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id
  ON public.gdpr_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type_status
  ON public.gdpr_requests(request_type, status);

CREATE INDEX IF NOT EXISTS idx_gdpr_requests_created_at
  ON public.gdpr_requests(created_at DESC);

ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gdpr_requests_select_own_or_admin" ON public.gdpr_requests;
CREATE POLICY "gdpr_requests_select_own_or_admin"
  ON public.gdpr_requests
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_builder_admin());

DROP POLICY IF EXISTS "gdpr_requests_insert_own_or_admin" ON public.gdpr_requests;
CREATE POLICY "gdpr_requests_insert_own_or_admin"
  ON public.gdpr_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.is_builder_admin());

DROP POLICY IF EXISTS "gdpr_requests_admin_update" ON public.gdpr_requests;
CREATE POLICY "gdpr_requests_admin_update"
  ON public.gdpr_requests
  FOR UPDATE
  USING (public.is_builder_admin())
  WITH CHECK (public.is_builder_admin());

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT,
  ADD COLUMN IF NOT EXISTS privacy_version TEXT,
  ADD COLUMN IF NOT EXISTS last_data_export_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- Keep request updated_at current for admin/manual updates.
CREATE OR REPLACE FUNCTION public.touch_gdpr_request_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_gdpr_request_updated_at ON public.gdpr_requests;
CREATE TRIGGER trg_touch_gdpr_request_updated_at
  BEFORE UPDATE ON public.gdpr_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_gdpr_request_updated_at();
