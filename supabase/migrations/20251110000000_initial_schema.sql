-- ====================================================================
-- Volturiano Initial Schema
-- Creates core entities, helper functions, RLS policies, and indexes.
-- Reference: docs/architecture/backend.md
-- ====================================================================

-- Extensions ----------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Helper Types --------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_type t
    where t.typname = 'compatibility_rule_type'
  ) then
    create type public.compatibility_rule_type as enum ('requires', 'incompatible');
  end if;

  if not exists (
    select 1
    from pg_type t
    where t.typname = 'order_status'
  ) then
    create type public.order_status as enum ('pending', 'deposit_paid', 'cancelled');
  end if;
end
$$;

-- Helper Functions ----------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin',
    false
  );
$$;

create or replace function public.generate_config_code()
returns text
language plpgsql
volatile
as $$
declare
  candidate text;
begin
  loop
    candidate :=
      upper(
        replace(
          encode(gen_random_bytes(5), 'base32'),
          '=',
          ''
        )
      );

    if not exists (
      select 1
      from public.user_configurations
      where config_code = candidate
    ) then
      return candidate;
    end if;
  end loop;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Tables --------------------------------------------------------------
create table if not exists public.materials (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  shader_preset text not null default 'car_paint',
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  description text,
  base_price numeric(12,2) not null default 0,
  performance_specs jsonb not null default '{}'::jsonb,
  default_angle_set text not null default 'exterior_default',
  hero_asset_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger vehicles_set_updated_at
before update on public.vehicles
for each row
execute procedure public.set_updated_at();

create table if not exists public.option_groups (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  slug text not null,
  name text not null,
  icon text,
  display_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  unique(vehicle_id, slug)
);

create table if not exists public.options (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.option_groups(id) on delete cascade,
  name text not null,
  description text,
  ui_control_type text not null default 'swatch',
  metadata jsonb not null default '{}'::jsonb,
  display_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.option_values (
  id uuid primary key default uuid_generate_v4(),
  option_id uuid not null references public.options(id) on delete cascade,
  name text not null,
  swatch_label text,
  price_delta numeric(12,2) not null default 0,
  asset_key text,
  material_id uuid references public.materials(id),
  metadata jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique(option_id, name)
);

create table if not exists public.compatibility_rules (
  id uuid primary key default uuid_generate_v4(),
  rule_type public.compatibility_rule_type not null,
  primary_option_value_id uuid not null references public.option_values(id) on delete cascade,
  secondary_option_value_id uuid not null references public.option_values(id) on delete cascade,
  message text,
  created_at timestamptz not null default timezone('utc', now()),
  unique(primary_option_value_id, secondary_option_value_id, rule_type)
);

create table if not exists public.user_configurations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id),
  name text not null default 'Untitled Specification',
  config_code text not null default public.generate_config_code(),
  selected_options jsonb not null default '{}'::jsonb,
  price_breakdown jsonb not null default '{}'::jsonb,
  thumbnail_asset_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(config_code)
);

create trigger user_configurations_set_updated_at
before update on public.user_configurations
for each row
execute procedure public.set_updated_at();

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  configuration_id uuid not null references public.user_configurations(id) on delete cascade,
  stripe_session_id text not null unique,
  status public.order_status not null default 'pending',
  deposit_amount numeric(12,2) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger orders_set_updated_at
before update on public.orders
for each row
execute procedure public.set_updated_at();

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- Indexes -------------------------------------------------------------
create index if not exists option_groups_vehicle_idx on public.option_groups (vehicle_id);
create index if not exists options_group_idx on public.options (group_id);
create index if not exists option_values_option_idx on public.option_values (option_id);
create index if not exists compatibility_rules_primary_idx on public.compatibility_rules (primary_option_value_id);
create index if not exists user_configurations_user_idx on public.user_configurations (user_id);
create index if not exists user_configurations_vehicle_idx on public.user_configurations (vehicle_id);
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_configuration_idx on public.orders (configuration_id);

-- Row Level Security --------------------------------------------------
alter table public.materials enable row level security;
alter table public.vehicles enable row level security;
alter table public.option_groups enable row level security;
alter table public.options enable row level security;
alter table public.option_values enable row level security;
alter table public.compatibility_rules enable row level security;
alter table public.user_configurations enable row level security;
alter table public.orders enable row level security;
alter table public.audit_logs enable row level security;

-- Public catalog read access (readonly)
create policy "Public materials read"
  on public.materials
  for select
  using (true);

create policy "Public vehicles read"
  on public.vehicles
  for select
  using (true);

create policy "Public option groups read"
  on public.option_groups
  for select
  using (true);

create policy "Public options read"
  on public.options
  for select
  using (true);

create policy "Public option values read"
  on public.option_values
  for select
  using (true);

create policy "Public compatibility rules read"
  on public.compatibility_rules
  for select
  using (true);

-- User configurations policies
create policy "User configurations are editable by owner"
  on public.user_configurations
  for all
  using (
    auth.uid() = user_id
    or public.is_admin()
  )
  with check (
    auth.uid() = user_id
    or public.is_admin()
  );

-- Orders policies
create policy "Orders readable by owner"
  on public.orders
  for select
  using (
    auth.uid() = user_id
    or public.is_admin()
  );

create policy "Orders upserted via edge functions"
  on public.orders
  for insert
  with check (public.is_admin());

create policy "Orders updated by admin"
  on public.orders
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Audit logs (admin only)
create policy "Audit logs admin only"
  on public.audit_logs
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Seed Data -----------------------------------------------------------
insert into public.materials (id, name, shader_preset, properties)
values
  (uuid_generate_v4(), 'Volturiano Gloss', 'car_paint', jsonb_build_object('clearcoat', 0.6, 'roughness', 0.2)),
  (uuid_generate_v4(), 'Volturiano Matte', 'car_paint', jsonb_build_object('clearcoat', 0.1, 'roughness', 0.6))
on conflict (name) do nothing;

with base_vehicle as (
  insert into public.vehicles (slug, name, description, base_price, performance_specs, default_angle_set, hero_asset_key)
  values (
    'volt-straight-01',
    'Volturiano Apex',
    'Flagship hyper-sedan blending sport and luxury DNA.',
    220000,
    jsonb_build_object(
      'power_hp', 1020,
      'torque_nm', 1200,
      'zero_to_hundred_s', 2.4,
      'top_speed_kmh', 360
    ),
    'exterior_default',
    'images/vehicles/apex/hero.webp'
  )
  on conflict (slug) do nothing
  returning id
)
insert into public.option_groups (vehicle_id, slug, name, icon, display_order)
select id, slug, name, icon, display_order
from (
  values
    ('exterior', 'Exterior', 'icon-exterior', 10),
    ('wheels', 'Wheels', 'icon-wheel', 20),
    ('interior', 'Interior', 'icon-seat', 30),
    ('performance', 'Performance', 'icon-performance', 40)
) as groups(slug, name, icon, display_order),
base_vehicle
on conflict (vehicle_id, slug) do nothing;

-- Example paint option -----------------------------------------------
with vehicle as (
  select id from public.vehicles where slug = 'volt-straight-01'
),
group_exterior as (
  select id
  from public.option_groups
  where vehicle_id = (select id from vehicle)
    and slug = 'exterior'
)
insert into public.options (group_id, name, description, ui_control_type, display_order)
select
  group_exterior.id,
  'Exterior Paint',
  'Signature palettes for the Apex exterior.',
  'swatch',
  10
from group_exterior
on conflict do nothing;

with option_exterior as (
  select id
  from public.options
  where name = 'Exterior Paint'
    and group_id in (
      select id
      from public.option_groups
      where slug = 'exterior'
    )
),
gloss_material as (
  select id
  from public.materials
  where name = 'Volturiano Gloss'
  limit 1
)
insert into public.option_values (
  option_id,
  name,
  swatch_label,
  price_delta,
  asset_key,
  material_id,
  metadata,
  is_default
)
select
  option_exterior.id,
  vals.name,
  vals.swatch_label,
  vals.price_delta,
  vals.asset_key,
  gm.id,
  vals.metadata,
  vals.is_default
from option_exterior
cross join gloss_material gm
cross join (
  values
    ('Apex Nero', 'Nero', 0, 'images/vehicles/apex/exterior/nero', jsonb_build_object('color_hex', '#0F1012'), true),
    ('Apex Aurora', 'Aurora', 4500, 'images/vehicles/apex/exterior/aurora', jsonb_build_object('color_hex', '#1B4C9B'), false),
    ('Apex Solaris', 'Solaris', 6200, 'images/vehicles/apex/exterior/solaris', jsonb_build_object('color_hex', '#F5A623'), false)
) as vals(name, swatch_label, price_delta, asset_key, metadata, is_default)
on conflict (option_id, name) do nothing;

-- ====================================================================
-- End of migration
-- ====================================================================

