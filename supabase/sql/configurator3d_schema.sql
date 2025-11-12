-- Supabase schema for Configurator 3D features

create extension if not exists "pgcrypto";

create table if not exists studio_light_presets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  hdri_url text not null,
  key_intensity numeric default 1,
  fill_intensity numeric default 0.6,
  rim_intensity numeric default 0.4,
  color_temperature integer default 6500,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists interior_light_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  color_hex text not null,
  intensity numeric default 1,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists scenario_presets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  manifest_slug text not null,
  lighting_preset uuid references studio_light_presets(id) on delete set null,
  interior_profile uuid references interior_light_profiles(id) on delete set null,
  props jsonb default '[]'::jsonb,
  audio_cues jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists render_export_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references account_profiles(id) on delete cascade,
  config_payload jsonb not null,
  resolution text not null,
  watermark boolean default true,
  status text not null default 'queued', -- queued | processing | completed | failed
  output_url text,
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists render_export_jobs_owner_idx on render_export_jobs (owner_id, created_at desc);

-- RLS
alter table if not exists studio_light_presets enable row level security;
alter table if not exists interior_light_profiles enable row level security;
alter table if not exists scenario_presets enable row level security;
alter table if not exists render_export_jobs enable row level security;

create policy if not exists "studio_light_presets_read" on studio_light_presets
  for select using (true);

create policy if not exists "interior_light_profiles_read" on interior_light_profiles
  for select using (true);

create policy if not exists "scenario_presets_read" on scenario_presets
  for select using (true);

create policy if not exists "render_export_jobs_owner" on render_export_jobs
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy if not exists "render_export_jobs_service_role" on render_export_jobs
  for all using (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role')
  with check (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role');

-- Updated_at triggers
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'studio_light_presets_updated_at') then
    create trigger studio_light_presets_updated_at
      before update on studio_light_presets
      for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'interior_light_profiles_updated_at') then
    create trigger interior_light_profiles_updated_at
      before update on interior_light_profiles
      for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'scenario_presets_updated_at') then
    create trigger scenario_presets_updated_at
      before update on scenario_presets
      for each row execute function set_updated_at();
  end if;
end
$$;


