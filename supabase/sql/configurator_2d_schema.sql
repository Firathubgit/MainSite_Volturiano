-- Configurator 2D schema: manifests, presets, inventory

create extension if not exists "pgcrypto";

create table if not exists config_2d_manifests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  version integer not null default 1,
  status text not null default 'draft', -- draft | published
  author_id uuid references account_profiles(id) on delete set null,
  data jsonb not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  published_at timestamptz
);

create index if not exists config_2d_manifests_status_idx on config_2d_manifests (status);

create table if not exists configurator_presets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  manifest_id uuid references config_2d_manifests(id) on delete set null,
  title text not null,
  subtitle text,
  description text,
  thumbnail_url text,
  sort_order integer default 0,
  config_payload jsonb not null,
  is_featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists configurator_presets_featured_idx on configurator_presets (is_featured, sort_order);

create table if not exists variant_inventory (
  id uuid primary key default gen_random_uuid(),
  manifest_slug text not null,
  option_code text not null,
  region text not null default 'global',
  status text not null default 'available', -- available | low | out
  quantity integer,
  threshold integer default 5,
  metadata jsonb,
  updated_at timestamptz default now()
);

create unique index if not exists variant_inventory_unique
  on variant_inventory (manifest_slug, option_code, region);

-- Row Level Security
alter table if not exists config_2d_manifests enable row level security;
alter table if not exists configurator_presets enable row level security;
alter table if not exists variant_inventory enable row level security;

create policy if not exists "configurator_manifests_read" on config_2d_manifests
  for select using (true);

create policy if not exists "configurator_manifests_service_role" on config_2d_manifests
  for all using (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role')
  with check (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role');

create policy if not exists "configurator_presets_read" on configurator_presets
  for select using (true);

create policy if not exists "configurator_presets_service_role" on configurator_presets
  for all using (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role')
  with check (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role');

create policy if not exists "variant_inventory_read" on variant_inventory
  for select using (true);

create policy if not exists "variant_inventory_service_role" on variant_inventory
  for all using (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role')
  with check (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role');

-- Trigger updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'config_2d_manifests_updated_at'
  ) then
    create trigger config_2d_manifests_updated_at
      before update on config_2d_manifests
      for each row execute function set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'configurator_presets_updated_at'
  ) then
    create trigger configurator_presets_updated_at
      before update on configurator_presets
      for each row execute function set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'variant_inventory_updated_at'
  ) then
    create trigger variant_inventory_updated_at
      before update on variant_inventory
      for each row execute function set_updated_at();
  end if;
end
$$;

-- Completed configurator 2D schema


