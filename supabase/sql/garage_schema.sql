-- Garage schema bootstrap for Supabase
-- Run via the Supabase SQL editor or migrations CLI

create extension if not exists "pgcrypto";

-- Note: profiles table should already exist from initial schema
-- If not, create it with: create table profiles (id uuid primary key references auth.users on delete cascade, display_name text, locale text default 'en', created_at timestamptz default now());

create table if not exists garage_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  vehicle_model text not null,
  state text not null default 'wishlist',
  config_payload jsonb not null,
  schema_version integer not null default 1,
  price_cents bigint,
  currency char(3) default 'EUR',
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz
);

create index if not exists garage_items_owner_idx on garage_items (owner_id);
create index if not exists garage_items_state_idx on garage_items (state);
create index if not exists garage_items_model_idx on garage_items (vehicle_model);
create index if not exists garage_items_created_idx on garage_items (created_at desc);

create table if not exists garage_versions (
  id uuid primary key default gen_random_uuid(),
  garage_item_id uuid not null references garage_items(id) on delete cascade,
  version_number integer not null,
  diff_summary jsonb,
  snapshot jsonb not null,
  created_at timestamptz default now()
);

create unique index if not exists garage_versions_unique
  on garage_versions (garage_item_id, version_number);

create table if not exists garage_item_tags (
  garage_item_id uuid not null references garage_items(id) on delete cascade,
  tag text not null,
  primary key (garage_item_id, tag)
);

create table if not exists garage_milestones (
  id uuid primary key default gen_random_uuid(),
  garage_item_id uuid not null references garage_items(id) on delete cascade,
  milestone_type text not null,
  note text,
  occurred_at timestamptz not null default now()
);

create table if not exists garage_activity (
  id uuid primary key default gen_random_uuid(),
  garage_item_id uuid references garage_items(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

create table if not exists test_drive_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  garage_item_id uuid references garage_items(id) on delete set null,
  vehicle_model text,
  preferred_date date,
  dealer text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists model_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  vehicle_model text not null,
  notify_email boolean default true,
  notify_push boolean default false,
  created_at timestamptz default now()
);

create table if not exists model_launches (
  id uuid primary key default gen_random_uuid(),
  vehicle_model text not null,
  launch_date date not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Enable RLS on garage_items
alter table garage_items enable row level security;
drop policy if exists "garage_items_owner_access" on garage_items;
create policy "garage_items_owner_access" on garage_items
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Enable RLS on garage_versions
alter table garage_versions enable row level security;
drop policy if exists "garage_versions_owner" on garage_versions;
create policy "garage_versions_owner" on garage_versions
  using (
    exists (
      select 1 from garage_items gi
      where gi.id = garage_versions.garage_item_id
        and gi.owner_id = auth.uid()
    )
  );

-- Enable RLS on garage_item_tags
alter table garage_item_tags enable row level security;
drop policy if exists "garage_item_tags_owner" on garage_item_tags;
create policy "garage_item_tags_owner" on garage_item_tags
  using (
    exists (
      select 1 from garage_items gi
      where gi.id = garage_item_tags.garage_item_id
        and gi.owner_id = auth.uid()
    )
  );

-- Enable RLS on garage_milestones
alter table garage_milestones enable row level security;
drop policy if exists "garage_milestones_owner" on garage_milestones;
create policy "garage_milestones_owner" on garage_milestones
  using (
    exists (
      select 1 from garage_items gi
      where gi.id = garage_milestones.garage_item_id
        and gi.owner_id = auth.uid()
    )
  );

-- Enable RLS on garage_activity
alter table garage_activity enable row level security;
drop policy if exists "garage_activity_owner" on garage_activity;
create policy "garage_activity_owner" on garage_activity
  using (
    exists (
      select 1 from garage_items gi
      where gi.id = garage_activity.garage_item_id
        and gi.owner_id = auth.uid()
    )
  );

-- Enable RLS on test_drive_requests
alter table test_drive_requests enable row level security;
drop policy if exists "test_drive_owner" on test_drive_requests;
create policy "test_drive_owner" on test_drive_requests
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Enable RLS on model_subscriptions
alter table model_subscriptions enable row level security;
drop policy if exists "model_subscriptions_owner" on model_subscriptions;
create policy "model_subscriptions_owner" on model_subscriptions
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

