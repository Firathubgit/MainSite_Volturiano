-- Diagnostic script to check garage data and user IDs
-- Run this to see what's in your database

-- 1. Show all users
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at;

-- 2. Show all garage items with their owner emails
SELECT 
  gi.id,
  gi.title,
  gi.state,
  gi.owner_id,
  u.email as owner_email,
  gi.created_at
FROM garage_items gi
LEFT JOIN auth.users u ON gi.owner_id = u.id
ORDER BY gi.created_at DESC;

-- 3. Count items per user
SELECT 
  u.email,
  u.id as user_id,
  COUNT(gi.id) as item_count
FROM auth.users u
LEFT JOIN garage_items gi ON u.id = gi.owner_id AND gi.archived_at IS NULL
GROUP BY u.id, u.email
ORDER BY item_count DESC;

-- 4. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'garage_items';

