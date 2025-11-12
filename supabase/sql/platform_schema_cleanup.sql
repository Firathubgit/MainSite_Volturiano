-- Cleanup script: Drop all platform tables to start fresh
-- Run this BEFORE platform_schema.sql if you're getting column errors

-- Drop tables in reverse dependency order
drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists configuration_options cascade;
drop table if exists configurations cascade;
drop table if exists vehicle_options cascade;
drop table if exists vehicles cascade;

-- Drop enum type
drop type if exists order_status cascade;

-- Drop policies only if tables exist
do $$ begin
  if exists (select 1 from information_schema.tables where table_name = 'vehicles') then
    drop policy if exists "vehicles_read_all" on vehicles;
  end if;
  if exists (select 1 from information_schema.tables where table_name = 'vehicle_options') then
    drop policy if exists "vehicle_options_read_all" on vehicle_options;
  end if;
  if exists (select 1 from information_schema.tables where table_name = 'configurations') then
    drop policy if exists "configurations_owner" on configurations;
    drop policy if exists "configurations_service_role" on configurations;
  end if;
  if exists (select 1 from information_schema.tables where table_name = 'configuration_options') then
    drop policy if exists "configuration_options_owner" on configuration_options;
    drop policy if exists "configuration_options_service_role" on configuration_options;
  end if;
  if exists (select 1 from information_schema.tables where table_name = 'orders') then
    drop policy if exists "orders_owner" on orders;
    drop policy if exists "orders_service_role" on orders;
  end if;
  if exists (select 1 from information_schema.tables where table_name = 'order_items') then
    drop policy if exists "order_items_owner" on order_items;
    drop policy if exists "order_items_service_role" on order_items;
  end if;
end $$;

-- Drop function
drop function if exists get_configuration_totals(uuid);
drop function if exists is_service_role();

-- Note: profiles table is NOT dropped (used by garage schema)
-- Note: garage_items is NOT dropped (separate schema)

