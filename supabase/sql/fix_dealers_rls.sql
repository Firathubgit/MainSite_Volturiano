-- Fix RLS policies for dealers table
-- This script ensures dealers can be read by both authenticated and anonymous users

-- Ensure RLS is enabled
alter table dealers enable row level security;

-- Drop ALL existing policies on dealers table to avoid conflicts
do $$
declare
  r record;
begin
  for r in (
    select policyname 
    from pg_policies 
    where schemaname = 'public' 
    and tablename = 'dealers'
  ) loop
    execute format('drop policy if exists %I on dealers', r.policyname);
  end loop;
end $$;

-- Create a single, simple policy that allows everyone to read active dealers
-- Using 'public' role which includes both authenticated and anon users
create policy "dealers_public_read" on dealers
  for select
  using (is_active = true);

-- Verify the policy was created
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
from pg_policies
where tablename = 'dealers';

