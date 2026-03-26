-- Add a flag to track if the congratulations bonus popup has been shown
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_received_bonus_popup BOOLEAN DEFAULT FALSE;

-- Optional: Enable RLS or update existing policies if needed
-- (Assuming profiles table already has standard RLS where users can read/write their own row)
