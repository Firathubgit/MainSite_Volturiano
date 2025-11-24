-- Fix for Admin RLS Recursion and Permissions
-- This script fixes the infinite recursion issue in profiles RLS policy
-- and ensures admin permissions are correctly set up.

-- 1. Redefine is_admin() to be robust and avoid recursion
-- We use SECURITY DEFINER to bypass RLS when checking roles
-- We set search_path to public to avoid search_path hijacking
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct query to profiles bypassing RLS (due to SECURITY DEFINER)
  -- This avoids the recursion where querying profiles triggers the policy which calls is_admin which queries profiles...
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('support_admin', 'content_admin', 'super_admin')
  );
END;
$$;

-- 2. Drop the problematic recursive policy
DROP POLICY IF EXISTS "profiles_admin_read" ON profiles;

-- 3. Recreate the policy using the safe is_admin() function
-- Note: id = auth.uid() allows users to read their own profile without triggering is_admin()
CREATE POLICY "profiles_admin_read" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR is_admin()
  );

-- 4. Ensure admin_permissions table exists
CREATE TABLE IF NOT EXISTS admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, resource, action)
);

-- Enable RLS on admin_permissions if not already enabled
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- Allow admins to read permissions
DROP POLICY IF EXISTS "admin_permissions_read" ON admin_permissions;
CREATE POLICY "admin_permissions_read" ON admin_permissions
  FOR SELECT USING (
    is_admin()
  );

-- Allow service role full access
DROP POLICY IF EXISTS "admin_permissions_service_role" ON admin_permissions;
CREATE POLICY "admin_permissions_service_role" ON admin_permissions
  FOR ALL USING (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role')
  WITH CHECK (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role');

-- 5. Insert default permissions if they don't exist
INSERT INTO admin_permissions (role, resource, action)
VALUES 
  ('super_admin', '*', '*'),
  ('content_admin', 'vehicles', '*'),
  ('content_admin', 'manifests', '*'),
  ('content_admin', 'files', '*'),
  ('support_admin', 'users', 'read'),
  ('support_admin', 'users', 'update'),
  ('support_admin', 'garage', 'read')
ON CONFLICT (role, resource, action) DO NOTHING;

-- 6. Ensure the role column exists and has the correct type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role text DEFAULT 'user';
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'support_admin', 'content_admin', 'super_admin'));
    END IF;
END $$;

