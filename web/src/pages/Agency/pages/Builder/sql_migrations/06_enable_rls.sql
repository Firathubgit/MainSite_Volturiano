-- Phase S3: Row Level Security (RLS) Enablement Script
-- Description: Applies strict read/write security constraints utilizing Supabase Auth mapping.

-- ─────────────────────────────────────────────────────────────────
-- 1. profiles table
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- We allow public profiles for the "Published Sites" gallery view if needed
DROP POLICY IF EXISTS "Public profile fields are readable" ON profiles;
CREATE POLICY "Public profile fields are readable"
  ON profiles FOR SELECT
  USING (true);


-- ─────────────────────────────────────────────────────────────────
-- 2. projects table
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────
-- 3. published_sites table
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE published_sites ENABLE ROW LEVEL SECURITY;

-- Anyone can view published sites on Volturiano
DROP POLICY IF EXISTS "Published sites are publicly readable" ON published_sites;
CREATE POLICY "Published sites are publicly readable"
  ON published_sites FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Users can manage own published sites" ON published_sites;
CREATE POLICY "Users can manage own published sites"
  ON published_sites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────
-- 4. snapshots table
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own snapshots" ON snapshots;
CREATE POLICY "Users can manage own snapshots"
  ON snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────
-- 5. credit_transactions table
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own billing history
DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Note: No INSERT policy exists for authenticated/anon roles!
-- This ensures ONLY the server (using supabaseAdmin service_role)
-- can insert or alter credit balances, preventing client-side spoofing.
