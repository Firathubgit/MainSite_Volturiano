-- =====================================================
-- Launch Hardening C: Stripe webhook ledger + refunds
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  livemode BOOLEAN,
  api_version TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processing', 'processed', 'skipped', 'duplicate', 'failed')),
  handled BOOLEAN DEFAULT false,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  last_duplicate_at TIMESTAMPTZ,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON public.stripe_webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status
  ON public.stripe_webhook_events(status);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received_at
  ON public.stripe_webhook_events(received_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stripe_webhook_events_admin_read" ON public.stripe_webhook_events;
CREATE POLICY "stripe_webhook_events_admin_read"
  ON public.stripe_webhook_events
  FOR SELECT
  USING (public.is_builder_admin());

-- Server-side service role writes webhook ledger rows. No client insert/update/delete policies.

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_dispute_id TEXT,
  ADD COLUMN IF NOT EXISTS reversal_of_transaction_id UUID REFERENCES public.credit_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_event_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_credit_transactions_checkout_session
  ON public.credit_transactions(stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_payment_intent
  ON public.credit_transactions(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_charge
  ON public.credit_transactions(stripe_charge_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_refund
  ON public.credit_transactions(stripe_refund_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_dispute
  ON public.credit_transactions(stripe_dispute_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_external_event_unique
  ON public.credit_transactions(external_event_id)
  WHERE external_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credit_transaction_id UUID REFERENCES public.credit_transactions(id) ON DELETE SET NULL,
  stripe_payment_id TEXT,
  stripe_invoice_id TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'approved', 'rejected', 'refunded', 'cancelled')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id
  ON public.refund_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_refund_requests_status
  ON public.refund_requests(status);

CREATE INDEX IF NOT EXISTS idx_refund_requests_created_at
  ON public.refund_requests(created_at DESC);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refund_requests_select_own_or_admin" ON public.refund_requests;
CREATE POLICY "refund_requests_select_own_or_admin"
  ON public.refund_requests
  FOR SELECT
  USING (auth.uid() = user_id OR public.is_builder_admin());

DROP POLICY IF EXISTS "refund_requests_insert_own" ON public.refund_requests;
CREATE POLICY "refund_requests_insert_own"
  ON public.refund_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "refund_requests_admin_update" ON public.refund_requests;
CREATE POLICY "refund_requests_admin_update"
  ON public.refund_requests
  FOR UPDATE
  USING (public.is_builder_admin())
  WITH CHECK (public.is_builder_admin());
