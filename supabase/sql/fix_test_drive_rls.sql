-- Fix RLS policies for test_drive_requests table
-- This ensures users can insert their own test drive requests

-- Ensure RLS is enabled
alter table test_drive_requests enable row level security;

-- Drop ALL existing policies on test_drive_requests table to avoid conflicts
do $$
declare
  r record;
begin
  for r in (
    select policyname 
    from pg_policies 
    where schemaname = 'public' 
    and tablename = 'test_drive_requests'
  ) loop
    execute format('drop policy if exists %I on test_drive_requests', r.policyname);
  end loop;
end $$;

-- Policy for SELECT: Users can only see their own requests
create policy "test_drive_requests_select_own" on test_drive_requests
  for select
  using (owner_id = auth.uid());

-- Policy for INSERT: Users can insert their own requests
-- Using auth.uid() directly in the check ensures the owner_id matches the current user
create policy "test_drive_requests_insert_own" on test_drive_requests
  for insert
  with check (owner_id = auth.uid());

-- Policy for UPDATE: Users can update their own requests
create policy "test_drive_requests_update_own" on test_drive_requests
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Policy for DELETE: Users can delete their own requests
create policy "test_drive_requests_delete_own" on test_drive_requests
  for delete
  using (owner_id = auth.uid());

-- Verify the policies were created
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
from pg_policies
where tablename = 'test_drive_requests'
order by cmd, policyname;

