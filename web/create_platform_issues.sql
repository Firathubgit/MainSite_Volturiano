-- SQL to create the platform_issues table
-- This table is a carbon copy of platform_feedback

CREATE TABLE platform_issues (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  page_source text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT platform_issues_pkey PRIMARY KEY (id),
  CONSTRAINT platform_issues_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE platform_issues ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own issues
CREATE POLICY "Users can insert their own issues" 
ON platform_issues 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only admins (or nobody, depending on your setup) can read. If you want users to read their own:
CREATE POLICY "Users can view their own issues" 
ON platform_issues 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);
