-- New accounts: default builder mode = hybrid (UI maps to premium pipeline "hybrid").
-- Previously some DBs used DEFAULT 'premium' for profiles.preferred_mode.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_mode TEXT;

ALTER TABLE public.profiles
  ALTER COLUMN preferred_mode SET DEFAULT 'hybrid';

COMMENT ON COLUMN public.profiles.preferred_mode IS
  'Builder mode: free | hybrid | premium (mapped to backend off | hybrid | strict).';
/LOL