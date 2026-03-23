-- Migration: 012_phase_s9_submission_thumbnail.sql
-- Description: Adds the missing thumbnail_url column to community_submissions

ALTER TABLE community_submissions 
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- For completeness, if preview_video_url is ever needed
ALTER TABLE community_submissions
  ADD COLUMN IF NOT EXISTS preview_video_url TEXT;
