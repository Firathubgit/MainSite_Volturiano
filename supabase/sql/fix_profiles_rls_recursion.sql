-- Fix Profiles RLS Recursion Issue
-- This script completely fixes the infinite recursion in profiles table RLS policies

-- STEP 1: Drop ALL existing policies on profiles to start fresh
DROP POLICY IF EXISTS "profiles_admin_read" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;

-- STEP 2: Recreate is_admin() function with SECURITY DEFINER to bypass RLS
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
END;
$$;

-- STEP 3: Create simple, non-recursive policies for profiles
-- Policy 1: Users can read their own profile (this does NOT call is_admin)
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Policy 2: Admins can read all profiles (uses SECURITY DEFINER function, no recursion)
CREATE POLICY "profiles_admin_read_all" ON profiles
  FOR SELECT
  USING (is_admin());

-- Policy 3: Users can update their own profile (non-admin fields only)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Prevent users from changing their own role
    (role IS NULL OR role = (SELECT role FROM profiles WHERE id = auth.uid()))
  );

-- Policy 4: Admins can update any profile
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- STEP 4: Grant execute permission on is_admin() to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- STEP 5: Verify the setup
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

