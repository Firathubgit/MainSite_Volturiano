-- Platform schema bootstrap
-- Provides vehicles, options, configurations, and orders

create extension if not exists "pgcrypto";

-- Ensure profiles table exists (required for foreign keys)
-- This table should match the one used by garage schema
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text default 'en',
  avatar_url text,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on profiles if not already enabled
alter table profiles enable row level security;

-- Drop and recreate profiles policy for idempotency
drop policy if exists "profiles_owner_access" on profiles;
create policy "profiles_owner_access" on profiles
  using (id = auth.uid())
  with check (id = auth.uid());

-- Create enum type if it doesn't exist
do $$ begin
  create type order_status as enum ('cart', 'pending', 'processing', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  trim text,
  year integer,
  base_price_cents bigint not null,
  currency char(3) default 'EUR',
  hero_image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists vehicle_options (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  category text not null,
  code text not null,
  label text not null,
  description text,
  price_cents bigint default 0,
  currency char(3) default 'EUR',
  media_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (vehicle_id, code)
);

-- Drop configurations table if it exists without owner_id column (from previous partial run)
do $$ begin
  if exists (
    select 1 from information_schema.tables 
    where table_name = 'configurations'
    and not exists (
      select 1 from information_schema.columns 
      where table_name = 'configurations' and column_name = 'owner_id'
    )
  ) then
    drop table configurations cascade;
  end if;
end $$;

create table if not exists configurations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  garage_item_id uuid, -- FK constraint added below if garage_items exists
  title text,
  notes text,
  pricing_summary jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add garage_item_id foreign key constraint if garage_items table exists
-- Note: Run garage_schema.sql first if you want this constraint enforced
do $$ begin
  if exists (select 1 from information_schema.tables where table_name = 'garage_items') then
    alter table configurations
      add constraint configurations_garage_item_id_fkey
      foreign key (garage_item_id) references garage_items(id) on delete set null;
  end if;
exception
  when duplicate_object then null; -- Constraint already exists
end $$;

-- Create index only if owner_id column exists
do $$ begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'configurations' and column_name = 'owner_id'
  ) then
    create index if not exists configurations_owner_idx on configurations (owner_id);
  end if;
end $$;

create table if not exists configuration_options (
  configuration_id uuid not null references configurations(id) on delete cascade,
  option_id uuid not null references vehicle_options(id) on delete cascade,
  quantity integer default 1,
  metadata jsonb,
  primary key (configuration_id, option_id)
);

-- Drop orders table if it exists without owner_id column (from previous partial run)
do $$ begin
  if exists (
    select 1 from information_schema.tables 
    where table_name = 'orders'
    and not exists (
      select 1 from information_schema.columns 
      where table_name = 'orders' and column_name = 'owner_id'
    )
  ) then
    drop table orders cascade;
  end if;
end $$;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  configuration_id uuid not null references configurations(id) on delete cascade,
  status order_status not null default 'cart',
  subtotal_cents bigint not null default 0,
  tax_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  total_cents bigint not null default 0,
  currency char(3) default 'EUR',
  placed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index only if owner_id column exists
do $$ begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'orders' and column_name = 'owner_id'
  ) then
    create index if not exists orders_owner_idx on orders (owner_id, created_at desc);
  end if;
end $$;

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  label text not null,
  kind text not null, -- base_price | option | tax | incentive
  amount_cents bigint not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Row Level Security
-- Enable RLS only if tables exist
do $$ begin
  if exists (select 1 from information_schema.tables where table_name = 'vehicles') then
    alter table vehicles enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_name = 'vehicle_options') then
    alter table vehicle_options enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_name = 'configurations') then
    alter table configurations enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_name = 'configuration_options') then
    alter table configuration_options enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_name = 'orders') then
    alter table orders enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_name = 'order_items') then
    alter table order_items enable row level security;
  end if;
end $$;

-- Drop and create policies (only if tables exist)
do $$ begin
  -- Vehicles policies
  if exists (select 1 from information_schema.tables where table_name = 'vehicles') then
    drop policy if exists "vehicles_read_all" on vehicles;
    create policy "vehicles_read_all" on vehicles
      for select using (true);
  end if;
  
  -- Vehicle options policies
  if exists (select 1 from information_schema.tables where table_name = 'vehicle_options') then
    drop policy if exists "vehicle_options_read_all" on vehicle_options;
    create policy "vehicle_options_read_all" on vehicle_options
      for select using (true);
  end if;
end $$;

-- Create policy only if owner_id column exists
do $$ begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'configurations' and column_name = 'owner_id'
  ) then
    create policy "configurations_owner" on configurations
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;
end $$;

-- Create configuration_options_owner policy only if tables exist
do $$ begin
  if exists (
    select 1 from information_schema.tables 
    where table_name = 'configuration_options'
  ) and exists (
    select 1 from information_schema.tables 
    where table_name = 'configurations'
  ) then
    drop policy if exists "configuration_options_owner" on configuration_options;
    create policy "configuration_options_owner" on configuration_options
      using (
        exists (
          select 1 from configurations c
          where c.id = configuration_options.configuration_id
            and c.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from configurations c
          where c.id = configuration_options.configuration_id
            and c.owner_id = auth.uid()
        )
      );
  end if;
end $$;

-- Create policy only if owner_id column exists
do $$ begin
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'orders' and column_name = 'owner_id'
  ) then
    create policy "orders_owner" on orders
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;
end $$;

-- Create order_items_owner policy only if tables exist
do $$ begin
  if exists (
    select 1 from information_schema.tables 
    where table_name = 'order_items'
  ) and exists (
    select 1 from information_schema.tables 
    where table_name = 'orders'
  ) then
    drop policy if exists "order_items_owner" on order_items;
    create policy "order_items_owner" on order_items
      using (
        exists (
          select 1 from orders o
          where o.id = order_items.order_id
            and o.owner_id = auth.uid()
        )
      );
  end if;
end $$;

-- Service role bypass
create or replace function is_service_role() returns boolean
language sql stable
as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'service_role',
    false
  );
$$;

-- Drop service role policies if they exist
drop policy if exists "configurations_service_role" on configurations;
drop policy if exists "configuration_options_service_role" on configuration_options;
drop policy if exists "orders_service_role" on orders;
drop policy if exists "order_items_service_role" on order_items;

create policy "configurations_service_role" on configurations
  for all using (is_service_role()) with check (is_service_role());

create policy "configuration_options_service_role" on configuration_options
  for all using (is_service_role()) with check (is_service_role());

create policy "orders_service_role" on orders
  for all using (is_service_role()) with check (is_service_role());

create policy "order_items_service_role" on order_items
  for all using (is_service_role()) with check (is_service_role());

-- RPC to compute configuration totals
create or replace function get_configuration_totals(config_id uuid)
returns table (
  base_cents bigint,
  options_cents bigint,
  taxes_cents bigint,
  incentives_cents bigint,
  total_cents bigint,
  currency char(3)
) as $$
  with base as (
    select v.base_price_cents as base_cents, v.currency
    from configurations c
    join vehicles v on v.id = c.vehicle_id
    where c.id = config_id
  ),
  option_prices as (
    select coalesce(sum(vo.price_cents * co.quantity), 0) as options_cents
    from configuration_options co
    join vehicle_options vo on vo.id = co.option_id
    where co.configuration_id = config_id
  ),
  taxes as (
    select coalesce(sum(case when oi.kind = 'tax' then oi.amount_cents end), 0) as taxes_cents,
           coalesce(sum(case when oi.kind = 'incentive' then oi.amount_cents end), 0) as incentives_cents
    from orders o
    left join order_items oi on oi.order_id = o.id
    where o.configuration_id = config_id
  )
  select
    base.base_cents,
    option_prices.options_cents,
    taxes.taxes_cents,
    taxes.incentives_cents,
    base.base_cents + option_prices.options_cents + taxes.taxes_cents - taxes.incentives_cents as total_cents,
    base.currency
  from base, option_prices, taxes;
$$ language sql stable security definer;

grant execute on function get_configuration_totals(uuid) to authenticated;

-- Compatibility check RPC function
-- Note: Requires compatibility_rules table (from initial_schema migration)
create or replace function check_compatibility(selected_options jsonb)
returns table (
  rule_id uuid,
  rule_type text,
  primary_option_value_id uuid,
  secondary_option_value_id uuid,
  message text,
  auto_resolve boolean,
  violation_type text
) as $$
begin
  return query
  with selected_values as (
    -- Extract option_value_ids from selected_options JSONB
    -- Format: {"option_id": "value_id", ...}
    select value::uuid as option_value_id
    from jsonb_each_text(selected_options)
  ),
  applicable_rules as (
    -- Find rules where primary option is selected
    select 
      cr.id as rule_id,
      cr.rule_type::text,
      cr.primary_option_value_id,
      cr.secondary_option_value_id,
      cr.message,
      exists(
        select 1 from selected_values sv2
        where sv2.option_value_id = cr.secondary_option_value_id
      ) as secondary_selected
    from compatibility_rules cr
    where cr.primary_option_value_id in (
      select option_value_id from selected_values
    )
  )
  select 
    ar.rule_id,
    ar.rule_type,
    ar.primary_option_value_id,
    ar.secondary_option_value_id,
    ar.message,
    case 
      when ar.rule_type = 'requires' and not ar.secondary_selected then true
      else false
    end as auto_resolve,
    case
      when ar.rule_type = 'requires' and not ar.secondary_selected then 'requires_missing'
      when ar.rule_type = 'incompatible' and ar.secondary_selected then 'incompatible_selected'
      else null
    end as violation_type
  from applicable_rules ar
  where 
    (ar.rule_type = 'requires' and not ar.secondary_selected) or
    (ar.rule_type = 'incompatible' and ar.secondary_selected);
end;
$$ language plpgsql stable security definer;

grant execute on function check_compatibility(jsonb) to authenticated;

-- Storage bucket setup (requires storage extension)
-- Note: Buckets must be created via Dashboard, not SQL
-- See docs/development/create-buckets-guide.md

-- ============================================================================
-- IMPORTANT: Configurator Support Preparation
-- ============================================================================
-- After running this schema, run prepare_configurator_support.sql to enhance
-- tables with configurator-specific fields and helper functions for Phase 3.
--
-- This prepares the database for:
-- - Configurator editing (edit button functionality)
-- - Adding new vehicles with configurator support
-- - Managing configurations via JSON payloads
--
-- File: supabase/sql/prepare_configurator_support.sql
-- Documentation: docs/development/configurator-preparation.md
-- ============================================================================

-- Completed schema


