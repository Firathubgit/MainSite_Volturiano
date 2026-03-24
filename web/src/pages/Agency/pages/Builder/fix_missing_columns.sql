-- ============================================================
-- FIX: Missing columns causing 402 and 500 errors in production
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Fix profiles.total_credits_remaining (causes 402 on /api/projects/init)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_credits_remaining integer DEFAULT 0;

-- 2. Fix templates.featured_priority (causes 500 on /api/community/browse/trending)
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS featured_priority integer DEFAULT NULL;

-- 3. Also ensure daily_credits_reset_at exists on profiles (used by credit system)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_credits_reset_at text DEFAULT NULL;

-- 4. Verify the columns were added:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('total_credits_remaining', 'daily_credits_reset_at', 'daily_credits_used', 'daily_credits_limit', 'plan');

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'templates'
  AND column_name = 'featured_priority';
