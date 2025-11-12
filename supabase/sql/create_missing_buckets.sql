-- Create missing Phase 1 storage buckets
-- 
-- NOTE: Buckets cannot be created via SQL in Supabase.
-- You MUST create them via the Dashboard or REST API.
--
-- Instructions:
-- 1. Go to Supabase Dashboard → Storage → Buckets
-- 2. Click "+ New bucket"
-- 3. Create each bucket with these settings:

-- Bucket 1: "renders"
--   - Name: renders
--   - Public: OFF (private)
--   - File size limit: 10MB
--   - Allowed MIME types: image/jpeg,image/png,image/webp

-- Bucket 2: "garage-thumbnails"
--   - Name: garage-thumbnails
--   - Public: OFF (private)
--   - File size limit: 5MB
--   - Allowed MIME types: image/jpeg,image/png,image/webp
--
-- After creating buckets, run storage_policies.sql to set up RLS policies.

