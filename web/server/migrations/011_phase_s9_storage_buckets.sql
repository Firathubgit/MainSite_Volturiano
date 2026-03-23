-- Migration: 011_phase_s9_storage_buckets.sql
-- Description: Creates the 'component-previews' storage bucket and its public read policies.

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'component-previews',
  'component-previews',
  true,
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create public read policy (anyone can view thumbnails)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'component-previews' );

-- 3. Create authenticated insert policy (Admin/Worker can upload)
-- The background worker uses the service_role key which bypasses RLS,
-- but we add this for completeness in case authenticated users need to upload direct media later.
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'component-previews' );

-- 4. Create authenticated update policy
CREATE POLICY "Authenticated users can update own uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'component-previews' AND owner = auth.uid() );

-- 5. Create authenticated delete policy
CREATE POLICY "Authenticated users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'component-previews' AND owner = auth.uid() );
