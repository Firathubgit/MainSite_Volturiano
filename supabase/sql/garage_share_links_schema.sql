-- Garage Share Links Schema
-- Run this in Supabase SQL Editor
-- This creates the table, indexes, RLS policies, and helper functions for sharing garage items

-- Create garage_share_links table
create table if not exists garage_share_links (
  id uuid primary key default gen_random_uuid(),
  garage_item_id uuid not null references garage_items(id) on delete cascade,
  share_code text unique not null,
  privacy text not null default 'unlisted' check (privacy in ('public', 'private', 'unlisted')),
  expires_at timestamptz,
  access_count integer default 0,
  last_accessed_at timestamptz,
  created_at timestamptz default now(),
  created_by uuid references profiles(id) on delete set null
);

-- Create indexes for performance
create index if not exists garage_share_links_code_idx on garage_share_links (share_code);
create index if not exists garage_share_links_item_idx on garage_share_links (garage_item_id);
create index if not exists garage_share_links_expires_idx on garage_share_links (expires_at) where expires_at is not null;

-- Enable RLS
alter table garage_share_links enable row level security;

-- Policy: Owners can manage their share links
drop policy if exists "garage_share_links_owner" on garage_share_links;
create policy "garage_share_links_owner" on garage_share_links
  using (
    exists (
      select 1 from garage_items gi
      where gi.id = garage_share_links.garage_item_id
        and gi.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from garage_items gi
      where gi.id = garage_share_links.garage_item_id
        and gi.owner_id = auth.uid()
    )
  );

-- Policy: Public read access via share_code (for unlisted/public links)
drop policy if exists "garage_share_links_public_read" on garage_share_links;
create policy "garage_share_links_public_read" on garage_share_links
  for select
  using (
    privacy in ('public', 'unlisted')
    and (expires_at is null or expires_at > now())
  );

-- Function to generate unique share code
create or replace function generate_share_code()
returns text
language plpgsql
as $$
declare
  code text;
  exists_check boolean;
begin
  loop
    -- Generate 12-character URL-safe code
    code := encode(gen_random_bytes(9), 'base64');
    code := replace(replace(code, '+', '-'), '/', '_');
    code := substring(code from 1 for 12);
    
    -- Check if code exists
    select exists(select 1 from garage_share_links where share_code = code) into exists_check;
    
    exit when not exists_check;
  end loop;
  
  return code;
end;
$$;

