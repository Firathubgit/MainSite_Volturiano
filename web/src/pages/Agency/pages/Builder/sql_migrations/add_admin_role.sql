-- Add admin_role column to profiles table
-- Default: false. Only set to true manually via Supabase Dashboard.
-- This column controls access to /builder/Atalmoretti admin panel.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_role boolean NOT NULL DEFAULT false;

-- COMMENT: To grant admin access, run:
-- UPDATE public.profiles SET admin_role = true WHERE id = '<your-user-uuid>';
