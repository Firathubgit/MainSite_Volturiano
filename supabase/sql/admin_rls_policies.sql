-- Admin RLS Policies
-- Helper functions and RLS policies for admin access

-- Helper function: Check if current user is an admin
create or replace function is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from profiles
    where id = auth.uid()
    and role in ('support_admin', 'content_admin', 'super_admin')
  );
end;
$$ language plpgsql security definer;

-- Helper function: Check if current user has specific admin role or higher
create or replace function has_admin_role(required_role text)
returns boolean as $$
declare
  user_role text;
begin
  select role into user_role from profiles where id = auth.uid();
  
  if user_role is null then
    return false;
  end if;
  
  -- Super admin has access to everything
  if required_role = 'super_admin' then
    return user_role = 'super_admin';
  -- Content admin can access content_admin and support_admin features
  elsif required_role = 'content_admin' then
    return user_role in ('content_admin', 'super_admin');
  -- Support admin can access support_admin features
  elsif required_role = 'support_admin' then
    return user_role in ('support_admin', 'content_admin', 'super_admin');
  end if;
  
  return false;
end;
$$ language plpgsql security definer;

-- Update RLS policies for config_2d_manifests to allow admin write access
drop policy if exists "config_2d_manifests_admin_write" on config_2d_manifests;
create policy "config_2d_manifests_admin_write" on config_2d_manifests
  for all using (is_admin())
  with check (is_admin());

-- Update RLS policies for vehicles to allow admin CRUD access
drop policy if exists "vehicles_admin_access" on vehicles;
create policy "vehicles_admin_access" on vehicles
  for all using (is_admin())
  with check (is_admin());

-- Update RLS policies for vehicle_options to allow admin CRUD access
drop policy if exists "vehicle_options_admin_access" on vehicle_options;
create policy "vehicle_options_admin_access" on vehicle_options
  for all using (is_admin())
  with check (is_admin());

-- Update RLS policies for garage_items to allow admin read access
drop policy if exists "garage_items_admin_read" on garage_items;
create policy "garage_items_admin_read" on garage_items
  for select using (is_admin());

-- Update RLS policies for configurations to allow admin read access
drop policy if exists "configurations_admin_read" on configurations;
create policy "configurations_admin_read" on configurations
  for select using (is_admin());

-- Update profiles table to allow admins to read all profiles (for user management)
drop policy if exists "profiles_admin_read" on profiles;
create policy "profiles_admin_read" on profiles
  for select using (
    id = auth.uid() or is_admin()
  );

-- Allow admins to update profiles (for user management)
drop policy if exists "profiles_admin_update" on profiles;
create policy "profiles_admin_update" on profiles
  for update using (is_admin())
  with check (is_admin());

























