-- Enhanced test_drive_requests table schema
-- Adds dealer_id FK, contact fields, status constraints, and indexes

-- Create dealers table if it doesn't exist
create table if not exists dealers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  location text,
  address text,
  is_active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add new columns to test_drive_requests table
alter table test_drive_requests
  add column if not exists dealer_id uuid references dealers(id) on delete set null,
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists updated_by uuid references profiles(id) on delete set null,
  add column if not exists cancelled_at timestamptz;

-- Add check constraint for status values
alter table test_drive_requests
  drop constraint if exists test_drive_status_check;
alter table test_drive_requests
  add constraint test_drive_status_check
  check (status in ('pending', 'confirmed', 'completed', 'cancelled'));

-- Create indexes for better query performance
create index if not exists idx_test_drive_owner_id on test_drive_requests(owner_id);
create index if not exists idx_test_drive_garage_item_id on test_drive_requests(garage_item_id);
create index if not exists idx_test_drive_dealer_id on test_drive_requests(dealer_id);
create index if not exists idx_test_drive_status on test_drive_requests(status);
create index if not exists idx_test_drive_created_at on test_drive_requests(created_at desc);

-- Create function to automatically update updated_at timestamp
create or replace function update_test_drive_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

-- Create trigger to auto-update updated_at
drop trigger if exists test_drive_update_updated_at on test_drive_requests;
create trigger test_drive_update_updated_at
  before update on test_drive_requests
  for each row
  execute function update_test_drive_updated_at();

-- Ensure dealers table has RLS policy for public read access
-- Dealers are public information, so anyone can read active dealers
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

-- Create a simple policy that allows everyone to read active dealers
-- This works for both authenticated and anonymous users
create policy "dealers_public_read" on dealers
  for select
  using (is_active = true);

-- Add index on dealers.is_active for efficient filtering
create index if not exists idx_dealers_is_active on dealers(is_active) where is_active = true;

-- Fix RLS policies for test_drive_requests table
-- Ensure users can insert their own test drive requests
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

