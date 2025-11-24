-- Admin Permissions System
-- Defines granular permissions for different admin roles

-- Create admin_permissions table
create table if not exists admin_permissions (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  resource text not null,  -- 'users', 'manifests', 'vehicles', '*'
  action text not null,    -- 'read', 'write', 'delete', 'publish', '*'
  created_at timestamptz default now(),
  unique(role, resource, action)
);

-- Create index on role for faster permission lookups
create index if not exists admin_permissions_role_idx on admin_permissions(role);

-- Enable RLS on admin_permissions
alter table admin_permissions enable row level security;

-- Policy: Everyone can read permissions (needed for frontend permission checks)
create policy "admin_permissions_read" on admin_permissions
  for select using (true);

-- Policy: Only service role can modify permissions
create policy "admin_permissions_service_role" on admin_permissions
  for all using (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role')
  with check (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role');

-- Seed default permissions for super_admin (has all permissions)
insert into admin_permissions (role, resource, action) values
  ('super_admin', '*', '*')
on conflict (role, resource, action) do nothing;

-- Seed default permissions for content_admin
insert into admin_permissions (role, resource, action) values
  ('content_admin', 'manifests', 'read'),
  ('content_admin', 'manifests', 'write'),
  ('content_admin', 'manifests', 'publish'),
  ('content_admin', 'vehicles', 'read'),
  ('content_admin', 'vehicles', 'write'),
  ('content_admin', 'vehicle_options', 'read'),
  ('content_admin', 'vehicle_options', 'write'),
  ('content_admin', 'garage_items', 'read'),
  ('content_admin', 'configurations', 'read')
on conflict (role, resource, action) do nothing;

-- Seed default permissions for support_admin
insert into admin_permissions (role, resource, action) values
  ('support_admin', 'users', 'read'),
  ('support_admin', 'users', 'write'),
  ('support_admin', 'profiles', 'read'),
  ('support_admin', 'profiles', 'write'),
  ('support_admin', 'garage_items', 'read'),
  ('support_admin', 'configurations', 'read'),
  ('support_admin', 'orders', 'read')
on conflict (role, resource, action) do nothing;

-- Function: Check if current user has specific permission
create or replace function check_admin_permission(
  required_resource text,
  required_action text
)
returns boolean as $$
declare
  user_role text;
begin
  -- Get current user's role
  select role into user_role from profiles where id = auth.uid();
  
  -- If no role or not admin, deny access
  if user_role is null then
    return false;
  end if;
  
  -- Super admin has all permissions
  if user_role = 'super_admin' then
    return true;
  end if;
  
  -- Check specific permission in admin_permissions table
  return exists (
    select 1 from admin_permissions
    where role = user_role
    and (
      (resource = required_resource or resource = '*')
      and (action = required_action or action = '*')
    )
  );
end;
$$ language plpgsql security definer;



