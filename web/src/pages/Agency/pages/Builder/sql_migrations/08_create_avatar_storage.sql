-- Phase S5: User Profiles & Avatar Storage Migration Script
-- Description: Adds 'role' to profiles and creates the 'user-avatars' bucket.

-- 1. Add "role" and "onboarding_completed" columns to profiles.
-- The IF NOT EXISTS ensures this script is idempotent.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- 2. Create the public bucket for user avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars', 
  'user-avatars', 
  true, 
  5242880, -- 5MB limit
  '{"image/jpeg","image/png","image/webp","image/gif"}'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Users can read avatars
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-avatars');

-- 4. Users can upload their own avatars
-- Requires the folder to be named their own auth.uid()
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Users can update their own avatars
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 6. Users can delete their own avatars
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
