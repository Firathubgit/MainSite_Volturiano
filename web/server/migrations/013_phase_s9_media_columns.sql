-- Phase S9.6: Smart Media Uploads
-- Add columns to temporarily store base64 media payloads before the async worker uploads them to Supabase Storage.

ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS thumbnail_base64 TEXT;
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS video_base64 TEXT;
ALTER TABLE community_submissions ADD COLUMN IF NOT EXISTS preview_video_url TEXT;

ALTER TABLE components ADD COLUMN IF NOT EXISTS preview_video_url TEXT;
