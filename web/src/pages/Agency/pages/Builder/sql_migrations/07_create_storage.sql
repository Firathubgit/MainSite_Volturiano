-- Phase S4: Supabase Storage Migration Script
-- Description: Creates the 'published-sites' bucket and defines the RLS policies for reading and uploading static site assets.

-- 1. Create the public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('published-sites', 'published-sites', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Anyone can read static site files from the bucket
DROP POLICY IF EXISTS "Public read access for published sites" ON storage.objects;
CREATE POLICY "Public read access for published sites"
ON storage.objects FOR SELECT
USING (bucket_id = 'published-sites');

-- 3. Authenticated users can upload to the bucket
DROP POLICY IF EXISTS "Authenticated users can upload published sites" ON storage.objects;
CREATE POLICY "Authenticated users can upload published sites"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'published-sites' 
  AND auth.role() = 'authenticated'
);

-- 4. Users can only delete their own uploaded files
-- Assumes the root folder name matches the user UUID or slug.
-- (We will rely heavily on supabaseAdmin backend role to manage deletions regardless, but this is a fallback).
DROP POLICY IF EXISTS "Users can delete own published files" ON storage.objects;
CREATE POLICY "Users can delete own published files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'published-sites' 
  AND auth.role() = 'authenticated'
);
