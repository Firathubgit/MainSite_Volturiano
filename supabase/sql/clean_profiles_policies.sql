-- Clean ALL Profiles Policies and Start Fresh
-- Run this if you still have infinite loading issues

-- Drop ALL existing policies (including ones with different names)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- Recreate is_admin() function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Direct query bypasses RLS due to SECURITY DEFINER
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN user_role IN ('support_admin', 'content_admin', 'super_admin');
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Create ONLY these 4 policies - no more, no less
-- Policy 1: Users read their own profile (NO recursion - direct auth.uid() check)
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Policy 2: Admins read all profiles (uses SECURITY DEFINER is_admin, safe)
CREATE POLICY "profiles_admin_read_all" ON profiles
  FOR SELECT
  USING (is_admin());

-- Policy 3: Users update their own profile, cannot change role
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Prevent role escalation: role must remain the same
    role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Policy 4: Admins can update any profile including role
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Verify: Should show exactly 4 policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%auth.uid()%' THEN 'Direct auth check (safe)'
    WHEN qual LIKE '%is_admin()%' THEN 'Admin function (SECURITY DEFINER)'
    ELSE qual
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

