-- =====================================================
-- PHASE S25: SIGNUP BONUS TRIGGER UPDATE
-- STATUS: PENDING — Run in Supabase SQL Editor
-- DATE: 2026-03-19
-- =====================================================
--
-- OVERVIEW:
-- Modifies the existing `handle_new_user()` auto-creation
-- trigger to grant new users a 5-credit welcome bonus
-- (expiring in 30 days) and set their initial daily limit
-- to 3 credits (Free tier default). It also records the
-- initial transaction in the ledger.
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Insert the new profile row with auth metadata AND the new signup bonus allocations
  INSERT INTO public.profiles (
    id, 
    display_name, 
    full_name, 
    avatar_url,
    signup_bonus_credits,
    signup_bonus_expires_at,
    daily_credits_limit
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture',
      ''
    ),
    5,                                     -- 5 signup bonus credits
    NOW() + INTERVAL '30 days',            -- expires in 30 days
    3                                      -- free plan daily limit of 3
  );

  -- 2. Log the initial welcome bonus in the credit_transactions ledger
  INSERT INTO public.credit_transactions (
    user_id, 
    amount, 
    type, 
    description
  )
  VALUES (
    NEW.id, 
    5, 
    'signup_bonus', 
    'Welcome bonus — 5 free credits'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Note: The trigger `on_auth_user_created` is already attached to this function 
-- on `auth.users`, so we don't need to drop/recreate the trigger itself.
