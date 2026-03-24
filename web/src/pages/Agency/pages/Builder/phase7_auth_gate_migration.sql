-- Phase P7 Migration: Enforce Auth on critical tables

-- 1. Ensure there are no rows with NULL user_id before applying the constraint.
-- If there are guest projects from testing, we'll associate them to an admin account or delete them.
-- WARNING: If you want to keep guest projects, assign them a specific valid UUID first before running DELETE.
DELETE FROM public.projects WHERE user_id IS NULL;
DELETE FROM public.published_sites WHERE user_id IS NULL;

-- 2. Add NOT NULL constraints
ALTER TABLE public.projects ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.published_sites ALTER COLUMN user_id SET NOT NULL;

-- Optional: Confirm they were successfully updated.
SELECT
    table_name, column_name, is_nullable
FROM
    information_schema.columns
WHERE
    table_name IN ('projects', 'published_sites') AND column_name = 'user_id';
