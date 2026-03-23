-- =====================================================
-- SCRIPT 5: BILLING TABLES & RLS POLICIES
-- =====================================================

-- 1. Create the credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Transaction
  amount INTEGER NOT NULL,          -- Positive = credit added, Negative = credit used
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus', 'refund', 'daily_reset')),
  description TEXT,

  -- Stripe Reference
  stripe_payment_id TEXT,
  stripe_invoice_id TEXT,

  -- Context
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Performance Indexes for credit_transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);

-- 3. Create the guest_rate_limits table (No RLS needed, accessed by server only)
CREATE TABLE IF NOT EXISTS guest_rate_limits (
  ip_address TEXT PRIMARY KEY,
  fingerprint TEXT,
  builds_today INTEGER DEFAULT 0,
  last_build_at TIMESTAMPTZ DEFAULT NOW(),
  reset_date DATE DEFAULT CURRENT_DATE
);

-- 4. Enable RLS on credit_transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for credit_transactions
-- Users can only view their own transactions
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Note: No INSERT/UPDATE policies for authenticated users.
-- Only the backend (using the service_role key) can insert or alter credit transactions.
