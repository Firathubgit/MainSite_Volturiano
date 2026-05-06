-- =====================================================
-- Launch Hardening B: Audit logs + runtime retention
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_builder_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT admin_role FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON public.audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON public.audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_read"
  ON public.audit_logs
  FOR SELECT
  USING (public.is_builder_admin());

-- No client insert/update/delete policy by design. Server-side service role writes audit rows.

ALTER TABLE public.agent_messages
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;

ALTER TABLE public.agent_tool_events
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;

ALTER TABLE public.agent_memory
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;

ALTER TABLE public.snapshots
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;

UPDATE public.agent_messages
SET retention_until = NOW() + INTERVAL '30 days'
WHERE retention_until IS NULL;

UPDATE public.agent_tool_events
SET retention_until = NOW() + INTERVAL '14 days'
WHERE retention_until IS NULL;

UPDATE public.agent_memory
SET retention_until = NOW() + INTERVAL '180 days'
WHERE retention_until IS NULL;

UPDATE public.snapshots
SET retention_until = NOW() + INTERVAL '90 days'
WHERE retention_until IS NULL;

CREATE INDEX IF NOT EXISTS idx_agent_messages_retention_until
  ON public.agent_messages(retention_until);

CREATE INDEX IF NOT EXISTS idx_agent_tool_events_retention_until
  ON public.agent_tool_events(retention_until);

CREATE INDEX IF NOT EXISTS idx_agent_memory_retention_until
  ON public.agent_memory(retention_until);

CREATE INDEX IF NOT EXISTS idx_snapshots_retention_until
  ON public.snapshots(retention_until);

CREATE OR REPLACE FUNCTION public.purge_expired_runtime_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.agent_tool_events
  WHERE retention_until IS NOT NULL
    AND retention_until < NOW();

  DELETE FROM public.agent_messages
  WHERE retention_until IS NOT NULL
    AND retention_until < NOW();

  DELETE FROM public.agent_memory
  WHERE retention_until IS NOT NULL
    AND retention_until < NOW();

  DELETE FROM public.snapshots
  WHERE retention_until IS NOT NULL
    AND retention_until < NOW();
END;
$$;
