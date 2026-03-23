-- =====================================================
-- SCRIPT 10: PHASE S12 — IRON-CLAD CREDIT SECURITY
-- STATUS: PENDING — Run in Supabase SQL Editor
-- DATE: 2026-03-10
-- =====================================================
-- 
-- PURPOSE:
-- This migration transforms the simple credit columns into a
-- tamper-proof "Vault" by:
--   1. Renaming the old column for clarity
--   2. Locking credit columns via RLS WITH CHECK
--   3. Creating atomic deduction/addition functions
--   4. Ensuring race-condition safety with row locks
--
-- SECURITY MODEL:
--   Frontend → can READ credits (SELECT own profile)
--   Frontend → CANNOT UPDATE credit/plan columns (RLS blocks it)
--   Backend  → calls deduct_credits_safe() via supabaseAdmin.rpc()
--   Webhook  → calls add_credits_safe() via supabaseAdmin.rpc()
-- =====================================================


-- ─────────────────────────────────────────────────────────────────
-- STEP 1: SCHEMA ENHANCEMENT
-- Rename the old column for consistency with Phase S12 design.
-- The old column was "total_credits_remaining" → now "total_credits_purchased"
-- to clearly represent that this is the PAID balance.
-- ─────────────────────────────────────────────────────────────────

-- Rename the existing column (safe: IF EXISTS guard via DO block)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'total_credits_remaining'
  ) THEN
    ALTER TABLE profiles RENAME COLUMN total_credits_remaining TO total_credits_purchased;
  END IF;
END $$;

-- Ensure the column exists with correct default (idempotent)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS total_credits_purchased INTEGER DEFAULT 0;

-- Ensure daily columns exist (already present from 01_profiles, but safe to re-check)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_credits_limit INTEGER DEFAULT 15;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_credits_used INTEGER DEFAULT 0;

-- Upgrade daily_credits_reset_at from DATE to TIMESTAMPTZ for precision
-- (original was DATE, we need TIMESTAMPTZ for hour-level resets)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'daily_credits_reset_at' 
      AND data_type = 'date'
  ) THEN
    ALTER TABLE profiles 
      ALTER COLUMN daily_credits_reset_at TYPE TIMESTAMPTZ 
      USING daily_credits_reset_at::timestamptz;
    ALTER TABLE profiles 
      ALTER COLUMN daily_credits_reset_at SET DEFAULT NOW();
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────
-- STEP 2: RLS LOCKDOWN — Restrict profile credit column updates
-- 
-- Problem: The current "Users can update own profile" policy lets
-- a user call supabase.from('profiles').update({ total_credits_purchased: 9999 })
-- from the browser console. We must block this.
--
-- Solution: Replace the UPDATE policy with one that uses WITH CHECK
-- to ensure the "sensitive" columns remain unchanged.
-- ─────────────────────────────────────────────────────────────────

-- Drop the old permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create the new "locked" update policy
-- Users CAN update their own row, BUT the WITH CHECK ensures that
-- the credit/plan columns remain IDENTICAL to their current values.
-- If a user tries to change them, the CHECK fails → 403.
CREATE POLICY "Users can update own profile (credit-locked)"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Ensure plan column is NOT changed by the user
    AND plan = (SELECT plan FROM profiles WHERE id = auth.uid())
    -- Ensure purchased credits are NOT changed by the user
    AND total_credits_purchased = (SELECT total_credits_purchased FROM profiles WHERE id = auth.uid())
    -- Ensure daily limit is NOT changed by the user
    AND daily_credits_limit = (SELECT daily_credits_limit FROM profiles WHERE id = auth.uid())
    -- Ensure daily used counter is NOT changed by the user
    AND daily_credits_used = (SELECT daily_credits_used FROM profiles WHERE id = auth.uid())
  );

-- NOTE: The service_role key bypasses RLS entirely, so the backend
-- and our SECURITY DEFINER functions can still modify these columns.


-- ─────────────────────────────────────────────────────────────────
-- STEP 3: ATOMIC DEDUCTION FUNCTION — deduct_credits_safe()
-- 
-- This is the "brain" of the billing system. It:
--   1. Acquires a ROW LOCK to prevent race conditions
--   2. Resets daily credits if the reset time has passed
--   3. Deducts from Daily Free first, then Purchased
--   4. Logs every transaction to credit_transactions
--   5. Returns success/failure as JSON
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION deduct_credits_safe(
  p_user_id UUID,
  p_amount INTEGER DEFAULT 1,
  p_description TEXT DEFAULT 'Website build',
  p_project_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs as the DB owner, bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_source TEXT := '';
BEGIN
  -- ── 1. Lock the row to prevent concurrent deductions ──
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

  -- ── 2. Daily reset check ──
  -- If the reset timestamp is in the past, reset the daily counter
  IF v_profile.daily_credits_reset_at < NOW() THEN
    UPDATE profiles SET
      daily_credits_used = 0,
      daily_credits_reset_at = (CURRENT_DATE + INTERVAL '1 day')::timestamptz
    WHERE id = p_user_id;
    -- Update local variable to reflect the reset
    v_profile.daily_credits_used := 0;
  END IF;

  -- ── 3. Deduction logic chain ──

  -- 3a. Unlimited plans (admin / enterprise): just log, no subtraction
  IF v_profile.plan IN ('admin', 'enterprise') THEN
    v_source := 'unlimited_plan';
    -- No balance change needed

  -- 3b. Daily free credits available?
  ELSIF v_profile.daily_credits_used + p_amount <= v_profile.daily_credits_limit THEN
    v_source := 'daily_free';
    UPDATE profiles
    SET daily_credits_used = daily_credits_used + p_amount
    WHERE id = p_user_id;

  -- 3c. Purchased credits available?
  ELSIF v_profile.total_credits_purchased >= p_amount THEN
    v_source := 'purchased';
    UPDATE profiles
    SET total_credits_purchased = total_credits_purchased - p_amount
    WHERE id = p_user_id;

  -- 3d. No credits available
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits. Daily limit reached and no purchased credits remaining.',
      'code', 'INSUFFICIENT_CREDITS',
      'daily_remaining', GREATEST(0, v_profile.daily_credits_limit - v_profile.daily_credits_used),
      'purchased_remaining', v_profile.total_credits_purchased
    );
  END IF;

  -- ── 4. Log the transaction ──
  INSERT INTO credit_transactions (user_id, amount, type, description, project_id)
  VALUES (p_user_id, -p_amount, 'usage', p_description, p_project_id);

  -- ── 5. Return success with current balances ──
  RETURN jsonb_build_object(
    'success', true,
    'source', v_source,
    'daily_remaining', GREATEST(0, 
      CASE 
        WHEN v_source = 'daily_free' THEN v_profile.daily_credits_limit - v_profile.daily_credits_used - p_amount
        ELSE v_profile.daily_credits_limit - v_profile.daily_credits_used
      END
    ),
    'purchased_remaining', 
      CASE 
        WHEN v_source = 'purchased' THEN v_profile.total_credits_purchased - p_amount
        ELSE v_profile.total_credits_purchased
      END
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────
-- STEP 4: CREDIT ADDITION FUNCTION — add_credits_safe()
-- 
-- Called ONLY by the Stripe webhook handler on the backend.
-- Adds purchased credits and logs the transaction with the
-- Stripe session ID for auditing.
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION add_credits_safe(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT 'Credit purchase',
  p_stripe_payment_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs as DB owner, bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
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

  -- Add credits atomically
  UPDATE profiles
  SET total_credits_purchased = total_credits_purchased + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING total_credits_purchased INTO v_new_balance;

  -- Log the purchase transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, stripe_payment_id)
  VALUES (p_user_id, p_amount, 'purchase', p_description, p_stripe_payment_id);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'credits_added', p_amount
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────
-- STEP 5: CONVENIENCE FUNCTION — get_credit_balance()
-- 
-- A read-only helper that returns the user's current credit state.
-- Safe to call from the frontend via supabase.rpc('get_credit_balance').
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_credit_balance(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_uid UUID;
  v_daily_remaining INTEGER;
BEGIN
  -- Use auth.uid() if no user_id specified (frontend calls)
  v_uid := COALESCE(p_user_id, auth.uid());

  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Auto-reset if needed (read-only view, actual reset happens on deduction)
  IF v_profile.daily_credits_reset_at < NOW() THEN
    v_daily_remaining := v_profile.daily_credits_limit;
  ELSE
    v_daily_remaining := GREATEST(0, v_profile.daily_credits_limit - v_profile.daily_credits_used);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'plan', v_profile.plan,
    'daily_remaining', v_daily_remaining,
    'daily_limit', v_profile.daily_credits_limit,
    'daily_used', v_profile.daily_credits_used,
    'purchased_remaining', v_profile.total_credits_purchased,
    'total_available', v_daily_remaining + v_profile.total_credits_purchased,
    'resets_at', v_profile.daily_credits_reset_at,
    'is_unlimited', v_profile.plan IN ('admin', 'enterprise')
  );
END;
$$;


-- ─────────────────────────────────────────────────────────────────
-- STEP 6: GRANT EXECUTION PERMISSIONS
-- Allow authenticated and service_role to call these RPC functions.
-- ─────────────────────────────────────────────────────────────────

-- deduct_credits_safe: Only callable by service_role (backend)
REVOKE ALL ON FUNCTION deduct_credits_safe FROM PUBLIC;
REVOKE ALL ON FUNCTION deduct_credits_safe FROM anon;
REVOKE ALL ON FUNCTION deduct_credits_safe FROM authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits_safe TO service_role;

-- add_credits_safe: Only callable by service_role (webhook)
REVOKE ALL ON FUNCTION add_credits_safe FROM PUBLIC;
REVOKE ALL ON FUNCTION add_credits_safe FROM anon;
REVOKE ALL ON FUNCTION add_credits_safe FROM authenticated;
GRANT EXECUTE ON FUNCTION add_credits_safe TO service_role;

-- get_credit_balance: Callable by authenticated users (frontend)
REVOKE ALL ON FUNCTION get_credit_balance FROM PUBLIC;
REVOKE ALL ON FUNCTION get_credit_balance FROM anon;
GRANT EXECUTE ON FUNCTION get_credit_balance TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_balance TO service_role;


-- =====================================================
-- VERIFICATION QUERIES (Run these manually to confirm)
-- =====================================================

-- Test 1: Check that the columns exist
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
--   AND column_name IN ('total_credits_purchased', 'daily_credits_limit', 'daily_credits_used', 'daily_credits_reset_at');

-- Test 2: Verify the functions exist
-- SELECT proname, prosecdef FROM pg_proc WHERE proname IN ('deduct_credits_safe', 'add_credits_safe', 'get_credit_balance');

-- Test 3: Verify RLS policies
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles';

-- Test 4: Tamper attack
-- NOTE: This CANNOT be tested from the SQL Editor because it runs as
-- the `postgres` superuser role, which bypasses RLS entirely.
-- auth.uid() also returns NULL here, so the WHERE clause matches 0 rows.
--
-- To properly test, open your site in the browser, log in, open DevTools
-- console, and run:
--   const { error } = await supabase.from('profiles')
--     .update({ total_credits_purchased: 9999 })
--     .eq('id', 'YOUR-UUID');
--   console.log(error);
--   // Expected: "new row violates row-level security policy"

-- Test 5: Test the deduction function (use a real user UUID)
-- SELECT deduct_credits_safe('YOUR-USER-UUID-HERE', 1, 'Test deduction');
