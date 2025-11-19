-- PDF Export Jobs Schema
-- Run this in Supabase SQL Editor
-- This creates the table, indexes, and RLS policies for PDF export job tracking

-- Create pdf_export_jobs table
create table if not exists pdf_export_jobs (
  id uuid primary key default gen_random_uuid(),
  garage_item_id uuid not null references garage_items(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  metadata jsonb default '{}'::jsonb,
  output_url text,
  error_message text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

-- Create indexes for performance
create index if not exists pdf_export_jobs_owner_idx on pdf_export_jobs (owner_id);
create index if not exists pdf_export_jobs_status_idx on pdf_export_jobs (status);
create index if not exists pdf_export_jobs_item_idx on pdf_export_jobs (garage_item_id);
create index if not exists pdf_export_jobs_created_idx on pdf_export_jobs (created_at desc);
create index if not exists pdf_export_jobs_expires_idx on pdf_export_jobs (expires_at) where expires_at is not null;

-- Enable RLS
alter table pdf_export_jobs enable row level security;

-- Policy: Owners can view and manage their own PDF export jobs
drop policy if exists "pdf_export_jobs_owner" on pdf_export_jobs;
create policy "pdf_export_jobs_owner" on pdf_export_jobs
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Function to update updated_at timestamp
create or replace function update_pdf_export_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger to automatically update updated_at
drop trigger if exists pdf_export_jobs_updated_at on pdf_export_jobs;
create trigger pdf_export_jobs_updated_at
  before update on pdf_export_jobs
  for each row
  execute function update_pdf_export_jobs_updated_at();


