-- Grant Admin Access to User
-- User: AdminGule (gulferkaya_2@hotmail.com)
-- User ID: b70f2f77-de71-4208-bbe8-1ef300a2d039

-- Option 1: Grant super_admin (highest level - has all permissions)
UPDATE profiles 
SET role = 'super_admin' 
WHERE id = 'b70f2f77-de71-4208-bbe8-1ef300a2d039';

-- Option 2: Grant content_admin (can manage manifests, vehicles, content)
-- UPDATE profiles 
-- SET role = 'content_admin' 
-- WHERE id = 'b70f2f77-de71-4208-bbe8-1ef300a2d039';

-- Option 3: Grant support_admin (can manage users, profiles, garage items)
-- UPDATE profiles 
-- SET role = 'support_admin' 
-- WHERE id = 'b70f2f77-de71-4208-bbe8-1ef300a2d039';

-- Alternative: Update by email (if ID is not available)
-- UPDATE profiles 
-- SET role = 'super_admin' 
-- WHERE id IN (
--   SELECT id FROM auth.users WHERE email = 'gulferkaya_2@hotmail.com'
-- );

-- Verify the update (with email from auth.users)
SELECT p.id, p.role, p.display_name, u.email
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.id = 'b70f2f77-de71-4208-bbe8-1ef300a2d039';

-- Alternative verification (if you don't have access to auth.users)
-- SELECT id, role, display_name 
-- FROM profiles 
-- WHERE id = 'b70f2f77-de71-4208-bbe8-1ef300a2d039';

