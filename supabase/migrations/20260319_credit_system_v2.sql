-- =====================================================
-- PHASE S25: CREDIT SYSTEM V2 — MULTI-BUCKET WALLET
-- STATUS: PENDING — Run in Supabase SQL Editor
-- DATE: 2026-03-19
-- =====================================================
--
-- OVERVIEW:
-- Migrates the flat 15-credit/day system to a 4-bucket wallet:
--   1. Monthly Free credits (3/day, 12/month cap)
--   2. Signup Bonus credits (5 one-time, expires 30 days)
--   3. Subscription credits (20/55/120 depending on plan)
--   4. Purchased credits (one-time packs from Stripe)
--
-- SPEND PRIORITY ORDER:
--   Monthly Free → Signup Bonus → Subscription → Purchased
--
-- FUNCTIONS:
--   deduct_credits_safe()       — 4-bucket atomic deduction
--   add_credits_safe()          — type-aware credit addition
--   get_credit_balance()        — full wallet state
--   handle_subscription_renewal() — monthly renewal logic
--   handle_signup_bonus()       — 5-credit welcome bonus
-- =====================================================


-- ═══════════════════════════════════════════════════════
-- STEP 1: ADD NEW COLUMNS TO profiles
-- ═══════════════════════════════════════════════════════

-- Wallet Buckets
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_bonus_credits INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_bonus_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_credits INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS purchased_credits INTEGER DEFAULT 0;

-- Monthly Free Tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_free_earned INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_free_cap INTEGER DEFAULT 12;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_free_reset_at TIMESTAMPTZ
  DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month');

-- Subscription State
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;


-- ═══════════════════════════════════════════════════════
-- STEP 2: MIGRATE EXISTING DATA
-- ═══════════════════════════════════════════════════════

-- Copy total_credits_purchased → purchased_credits (only if not already migrated)
UPDATE profiles
SET purchased_credits = COALESCE(total_credits_purchased, 0)
WHERE purchased_credits = 0
  AND COALESCE(total_credits_purchased, 0) > 0;

-- Reduce daily limit from 15 → 3 for all free-plan users
UPDATE profiles
SET daily_credits_limit = 3
WHERE COALESCE(plan, 'free') = 'free'
  AND daily_credits_limit > 3;

-- Grant all existing users the retroactive 5-credit signup bonus
UPDATE profiles
SET signup_bonus_credits = 5,
    signup_bonus_expires_at = NOW() + INTERVAL '30 days'
WHERE signup_bonus_credits = 0;


-- ═══════════════════════════════════════════════════════
-- STEP 2.5: DROP OLD FUNCTION SIGNATURES
-- The old functions have different parameter counts, which
-- causes PostgreSQL to treat them as overloads instead of
-- replacements. We must drop them explicitly first.
-- ═══════════════════════════════════════════════════════

-- Old: deduct_credits_safe(UUID, INTEGER, TEXT, UUID) — same sig, safe to replace
-- Old: add_credits_safe(UUID, INTEGER, TEXT, TEXT) — DIFFERENT from new 5-param version
DROP FUNCTION IF EXISTS add_credits_safe(UUID, INTEGER, TEXT, TEXT);
-- Old: get_credit_balance(UUID) — same sig, safe to replace


-- ═══════════════════════════════════════════════════════
-- STEP 3: deduct_credits_safe() — 4-BUCKET ATOMIC DEDUCTION
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION deduct_credits_safe(
  p_user_id UUID,
  p_amount INTEGER DEFAULT 1,
  p_description TEXT DEFAULT 'Website build',
  p_project_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_source TEXT := '';
BEGIN
  -- 1. Lock the row to prevent concurrent deductions
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found.',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  -- 2. Daily reset check
  IF v_profile.daily_credits_reset_at < NOW() THEN
    UPDATE profiles SET
      daily_credits_used = 0,
      daily_credits_reset_at = (CURRENT_DATE + INTERVAL '1 day')::timestamptz
    WHERE id = p_user_id;
    v_profile.daily_credits_used := 0;
  END IF;

  -- 3. Monthly reset check
  IF v_profile.monthly_free_reset_at < NOW() THEN
    UPDATE profiles SET
      monthly_free_earned = 0,
      monthly_free_reset_at = date_trunc('month', NOW()) + INTERVAL '1 month'
    WHERE id = p_user_id;
    v_profile.monthly_free_earned := 0;
  END IF;

  -- 4. Deduction logic chain (4-bucket priority)

  -- 4a. Unlimited plans (admin / enterprise): log only, no subtraction
  IF v_profile.plan IN ('admin', 'enterprise') THEN
    v_source := 'unlimited_plan';

  -- 4b. Priority 1: Daily free credits (within daily AND monthly limits)
  ELSIF (v_profile.daily_credits_used + p_amount <= v_profile.daily_credits_limit)
    AND (v_profile.monthly_free_earned + p_amount <= COALESCE(v_profile.monthly_free_cap, 12))
  THEN
    v_source := 'monthly_free';
    UPDATE profiles
    SET daily_credits_used = daily_credits_used + p_amount,
        monthly_free_earned = monthly_free_earned + p_amount
    WHERE id = p_user_id;

  -- 4c. Priority 2: Signup bonus credits (not expired)
  ELSIF v_profile.signup_bonus_credits >= p_amount
    AND v_profile.signup_bonus_expires_at IS NOT NULL
    AND v_profile.signup_bonus_expires_at > NOW()
  THEN
    v_source := 'signup_bonus';
    UPDATE profiles
    SET signup_bonus_credits = signup_bonus_credits - p_amount
    WHERE id = p_user_id;

  -- 4d. Priority 3: Subscription credits
  ELSIF v_profile.subscription_credits >= p_amount THEN
    v_source := 'subscription';
    UPDATE profiles
    SET subscription_credits = subscription_credits - p_amount
    WHERE id = p_user_id;

  -- 4e. Priority 4: Purchased credits
  ELSIF v_profile.purchased_credits >= p_amount THEN
    v_source := 'purchased';
    UPDATE profiles
    SET purchased_credits = purchased_credits - p_amount
    WHERE id = p_user_id;

  -- 4f. No credits available
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits. All buckets exhausted.',
      'code', 'INSUFFICIENT_CREDITS',
      'monthly_free_remaining', GREATEST(0,
        LEAST(
          v_profile.daily_credits_limit - v_profile.daily_credits_used,
          COALESCE(v_profile.monthly_free_cap, 12) - v_profile.monthly_free_earned
        )
      ),
      'signup_bonus_remaining', CASE
        WHEN v_profile.signup_bonus_expires_at IS NOT NULL AND v_profile.signup_bonus_expires_at > NOW()
        THEN v_profile.signup_bonus_credits
        ELSE 0
      END,
      'subscription_remaining', v_profile.subscription_credits,
      'purchased_remaining', v_profile.purchased_credits
    );
  END IF;

  -- 5. Log the transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, project_id)
  VALUES (p_user_id, -p_amount, 'usage', p_description || ' [' || v_source || ']', p_project_id);

  -- 6. Return success with current balances
  RETURN jsonb_build_object(
    'success', true,
    'source', v_source,
    'monthly_free_remaining', GREATEST(0,
      CASE
        WHEN v_source = 'monthly_free'
        THEN LEAST(
          v_profile.daily_credits_limit - v_profile.daily_credits_used - p_amount,
          COALESCE(v_profile.monthly_free_cap, 12) - v_profile.monthly_free_earned - p_amount
        )
        ELSE LEAST(
          v_profile.daily_credits_limit - v_profile.daily_credits_used,
          COALESCE(v_profile.monthly_free_cap, 12) - v_profile.monthly_free_earned
        )
      END
    ),
    'signup_bonus_remaining', CASE
      WHEN v_source = 'signup_bonus' THEN v_profile.signup_bonus_credits - p_amount
      WHEN v_profile.signup_bonus_expires_at IS NOT NULL AND v_profile.signup_bonus_expires_at > NOW()
      THEN v_profile.signup_bonus_credits
      ELSE 0
    END,
    'subscription_remaining', CASE
      WHEN v_source = 'subscription' THEN v_profile.subscription_credits - p_amount
      ELSE v_profile.subscription_credits
    END,
    'purchased_remaining', CASE
      WHEN v_source = 'purchased' THEN v_profile.purchased_credits - p_amount
      ELSE v_profile.purchased_credits
    END
  );
END;
$$;


-- ═══════════════════════════════════════════════════════
-- STEP 4: add_credits_safe() — TYPE-AWARE CREDIT ADDITION
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION add_credits_safe(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT 'Credit purchase',
  p_stripe_payment_id TEXT DEFAULT NULL,
  p_credit_type TEXT DEFAULT 'purchased'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
  v_tx_type TEXT;
BEGIN
  -- Sanity check: amount must be positive
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Credit amount must be positive.',
      'code', 'INVALID_AMOUNT'
    );
  END IF;

  -- Check user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found.',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  -- Route by credit type
  IF p_credit_type = 'signup_bonus' THEN
    UPDATE profiles
    SET signup_bonus_credits = p_amount,
        signup_bonus_expires_at = NOW() + INTERVAL '30 days',
        updated_at = NOW()
    WHERE id = p_user_id;
    v_new_balance := p_amount;
    v_tx_type := 'signup_bonus';

  ELSIF p_credit_type = 'subscription' THEN
    UPDATE profiles
    SET subscription_credits = p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
    v_new_balance := p_amount;
    v_tx_type := 'subscription';

  ELSIF p_credit_type = 'purchased' THEN
    UPDATE profiles
    SET purchased_credits = purchased_credits + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING purchased_credits INTO v_new_balance;
    v_tx_type := 'purchase';

  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid credit type: ' || p_credit_type,
      'code', 'INVALID_TYPE'
    );
  END IF;

  -- Log the transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, stripe_payment_id)
  VALUES (p_user_id, p_amount, v_tx_type, p_description, p_stripe_payment_id);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'credits_added', p_amount,
    'credit_type', p_credit_type
  );
END;
$$;


-- ═══════════════════════════════════════════════════════
-- STEP 5: get_credit_balance() — FULL WALLET STATE
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_credit_balance(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_uid UUID;
  v_monthly_free_remaining INTEGER;
  v_signup_bonus_remaining INTEGER;
  v_effective_daily_used INTEGER;
  v_effective_monthly_earned INTEGER;
BEGIN
  v_uid := COALESCE(p_user_id, auth.uid());

  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Auto-reset daily counter if needed (read-only preview)
  IF v_profile.daily_credits_reset_at < NOW() THEN
    v_effective_daily_used := 0;
  ELSE
    v_effective_daily_used := v_profile.daily_credits_used;
  END IF;

  -- Auto-reset monthly counter if needed (read-only preview)
  IF v_profile.monthly_free_reset_at < NOW() THEN
    v_effective_monthly_earned := 0;
  ELSE
    v_effective_monthly_earned := v_profile.monthly_free_earned;
  END IF;

  -- Monthly free: min of daily remaining and monthly remaining
  v_monthly_free_remaining := GREATEST(0,
    LEAST(
      v_profile.daily_credits_limit - v_effective_daily_used,
      COALESCE(v_profile.monthly_free_cap, 12) - v_effective_monthly_earned
    )
  );

  -- Signup bonus: 0 if expired
  IF v_profile.signup_bonus_expires_at IS NOT NULL AND v_profile.signup_bonus_expires_at > NOW() THEN
    v_signup_bonus_remaining := COALESCE(v_profile.signup_bonus_credits, 0);
  ELSE
    v_signup_bonus_remaining := 0;
  END IF;

  RETURN jsonb_build_object(
    'success', true,

    -- Plan info
    'plan', COALESCE(v_profile.plan, 'free'),
    'subscription_plan', COALESCE(v_profile.subscription_plan, 'free'),
    'subscription_status', COALESCE(v_profile.subscription_status, 'active'),
    'subscription_period_end', v_profile.subscription_period_end,

    -- Bucket balances
    'monthly_free_remaining', v_monthly_free_remaining,
    'signup_bonus_remaining', v_signup_bonus_remaining,
    'subscription_remaining', COALESCE(v_profile.subscription_credits, 0),
    'purchased_remaining', COALESCE(v_profile.purchased_credits, 0),

    -- Aggregate
    'total_available', v_monthly_free_remaining
      + v_signup_bonus_remaining
      + COALESCE(v_profile.subscription_credits, 0)
      + COALESCE(v_profile.purchased_credits, 0),

    -- Daily/Monthly tracking
    'daily_limit', v_profile.daily_credits_limit,
    'daily_used', v_effective_daily_used,
    'monthly_free_cap', COALESCE(v_profile.monthly_free_cap, 12),
    'monthly_free_earned', v_effective_monthly_earned,
    'resets_at', v_profile.daily_credits_reset_at,
    'monthly_resets_at', v_profile.monthly_free_reset_at,

    -- Flags
    'is_unlimited', v_profile.plan IN ('admin', 'enterprise'),
    'is_paid', COALESCE(v_profile.subscription_plan, 'free') != 'free'
  );
END;
$$;


-- ═══════════════════════════════════════════════════════
-- STEP 6: handle_subscription_renewal()
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_subscription_renewal(
  p_user_id UUID,
  p_plan TEXT,
  p_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  -- Look up credits for plan
  CASE p_plan
    WHEN 'starter' THEN v_credits := 20;
    WHEN 'pro'     THEN v_credits := 55;
    WHEN 'studio'  THEN v_credits := 120;
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Unknown plan: ' || p_plan,
        'code', 'INVALID_PLAN'
      );
  END CASE;

  -- Check user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found.',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  -- Reset subscription credits to plan allocation (REPLACE, not ADD)
  -- Reset monthly free counter so free credits start fresh
  UPDATE profiles
  SET subscription_credits = v_credits,
      monthly_free_earned = 0,
      subscription_period_end = COALESCE(p_period_end, NOW() + INTERVAL '1 month'),
      subscription_plan = p_plan,
      subscription_status = 'active',
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the renewal transaction
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, v_credits, 'subscription',
    'Subscription renewal: ' || p_plan || ' plan (' || v_credits || ' credits)');

  RETURN jsonb_build_object(
    'success', true,
    'plan', p_plan,
    'credits_allocated', v_credits,
    'period_end', COALESCE(p_period_end, NOW() + INTERVAL '1 month')
  );
END;
$$;


-- ═══════════════════════════════════════════════════════
-- STEP 7: handle_signup_bonus()
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_signup_bonus(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found.',
      'code', 'USER_NOT_FOUND'
    );
  END IF;

  -- Set 5 signup bonus credits with 30-day expiry
  UPDATE profiles
  SET signup_bonus_credits = 5,
      signup_bonus_expires_at = NOW() + INTERVAL '30 days',
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the bonus transaction
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, 5, 'signup_bonus', 'Welcome bonus — 5 free credits (expires in 30 days)');

  RETURN jsonb_build_object(
    'success', true,
    'credits_added', 5,
    'expires_at', NOW() + INTERVAL '30 days'
  );
END;
$$;


-- ═══════════════════════════════════════════════════════
-- STEP 8: RLS POLICY UPDATE — Lock new credit columns
-- ═══════════════════════════════════════════════════════

-- Drop the existing credit-locked update policy
DROP POLICY IF EXISTS "Users can update own profile (credit-locked)" ON profiles;

-- Recreate with ALL credit/subscription columns locked
CREATE POLICY "Users can update own profile (credit-locked)"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Original locks
    AND plan = (SELECT plan FROM profiles WHERE id = auth.uid())
    AND total_credits_purchased = (SELECT total_credits_purchased FROM profiles WHERE id = auth.uid())
    AND daily_credits_limit = (SELECT daily_credits_limit FROM profiles WHERE id = auth.uid())
    AND daily_credits_used = (SELECT daily_credits_used FROM profiles WHERE id = auth.uid())
    -- New wallet bucket locks
    AND signup_bonus_credits = (SELECT signup_bonus_credits FROM profiles WHERE id = auth.uid())
    AND subscription_credits = (SELECT subscription_credits FROM profiles WHERE id = auth.uid())
    AND purchased_credits = (SELECT purchased_credits FROM profiles WHERE id = auth.uid())
    AND monthly_free_earned = (SELECT monthly_free_earned FROM profiles WHERE id = auth.uid())
    -- Subscription state locks
    AND subscription_plan = (SELECT subscription_plan FROM profiles WHERE id = auth.uid())
    AND subscription_status = (SELECT subscription_status FROM profiles WHERE id = auth.uid())
    AND (subscription_period_end IS NOT DISTINCT FROM
         (SELECT subscription_period_end FROM profiles WHERE id = auth.uid()))
  );


-- ═══════════════════════════════════════════════════════
-- STEP 9: GRANT EXECUTION PERMISSIONS
-- Using explicit argument lists to avoid ambiguity.
-- ═══════════════════════════════════════════════════════

-- deduct_credits_safe: service_role ONLY (backend)
REVOKE ALL ON FUNCTION deduct_credits_safe(UUID, INTEGER, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION deduct_credits_safe(UUID, INTEGER, TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION deduct_credits_safe(UUID, INTEGER, TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits_safe(UUID, INTEGER, TEXT, UUID) TO service_role;

-- add_credits_safe: service_role ONLY (webhook)
REVOKE ALL ON FUNCTION add_credits_safe(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION add_credits_safe(UUID, INTEGER, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION add_credits_safe(UUID, INTEGER, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION add_credits_safe(UUID, INTEGER, TEXT, TEXT, TEXT) TO service_role;

-- handle_subscription_renewal: service_role ONLY (webhook)
REVOKE ALL ON FUNCTION handle_subscription_renewal(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION handle_subscription_renewal(UUID, TEXT, TIMESTAMPTZ) FROM anon;
REVOKE ALL ON FUNCTION handle_subscription_renewal(UUID, TEXT, TIMESTAMPTZ) FROM authenticated;
GRANT EXECUTE ON FUNCTION handle_subscription_renewal(UUID, TEXT, TIMESTAMPTZ) TO service_role;

-- handle_signup_bonus: service_role ONLY (backend/trigger)
REVOKE ALL ON FUNCTION handle_signup_bonus(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION handle_signup_bonus(UUID) FROM anon;
REVOKE ALL ON FUNCTION handle_signup_bonus(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION handle_signup_bonus(UUID) TO service_role;

-- get_credit_balance: authenticated + service_role (frontend + backend)
REVOKE ALL ON FUNCTION get_credit_balance(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_credit_balance(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION get_credit_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_balance(UUID) TO service_role;


-- =====================================================
-- VERIFICATION QUERIES (Run manually to confirm)
-- =====================================================

-- Test 1: Check new columns exist
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
--   AND column_name IN (
--     'signup_bonus_credits', 'signup_bonus_expires_at',
--     'subscription_credits', 'purchased_credits',
--     'monthly_free_earned', 'monthly_free_cap', 'monthly_free_reset_at',
--     'subscription_plan', 'subscription_status', 'subscription_period_end'
--   );

-- Test 2: Verify all 5 functions exist
-- SELECT proname, prosecdef
-- FROM pg_proc
-- WHERE proname IN (
--   'deduct_credits_safe', 'add_credits_safe',
--   'get_credit_balance', 'handle_subscription_renewal', 'handle_signup_bonus'
-- );

-- Test 3: Verify RLS policies on profiles
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'profiles';

-- Test 4: Verify data migration
-- SELECT id, daily_credits_limit, purchased_credits, signup_bonus_credits,
--        signup_bonus_expires_at, monthly_free_cap
-- FROM profiles LIMIT 5;

-- Test 5: Test get_credit_balance (use a real user UUID)
-- SELECT get_credit_balance('YOUR-USER-UUID-HERE');

-- Test 6: Test deduction priority chain
-- SELECT deduct_credits_safe('YOUR-USER-UUID-HERE', 1, 'Test deduction');

-- Test 7: Tamper test from browser console (should FAIL):
--   const { error } = await supabase.from('profiles')
--     .update({ subscription_credits: 9999 })
--     .eq('id', 'YOUR-UUID');
--   console.log(error);
--   // Expected: "new row violates row-level security policy"
