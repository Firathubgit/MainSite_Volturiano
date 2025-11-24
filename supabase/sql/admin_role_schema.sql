-- Admin Role System Schema
-- Adds role column to profiles and creates admin infrastructure

-- Add role column to profiles table
alter table profiles 
add column if not exists role text default 'user' 
check (role in ('user', 'support_admin', 'content_admin', 'super_admin'));

-- Create index on role for faster queries
create index if not exists profiles_role_idx on profiles(role);

-- Create admin_audit_logs table for tracking all admin actions
create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id) on delete set null,
  action text not null,  -- 'user_created', 'manifest_published', etc.
  resource_type text not null,  -- 'user', 'manifest', 'vehicle'
  resource_id uuid,
  details jsonb default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

-- Create indexes on admin_audit_logs for efficient querying
create index if not exists admin_audit_logs_admin_id_idx on admin_audit_logs(admin_id);
create index if not exists admin_audit_logs_action_idx on admin_audit_logs(action);
create index if not exists admin_audit_logs_resource_type_idx on admin_audit_logs(resource_type);
create index if not exists admin_audit_logs_created_at_idx on admin_audit_logs(created_at);

-- Enable RLS on admin_audit_logs
alter table admin_audit_logs enable row level security;

-- Policy: Admins can read all audit logs
create policy "admin_audit_logs_read" on admin_audit_logs
  for select using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('support_admin', 'content_admin', 'super_admin')
    )
  );

-- Policy: Service role can insert audit logs (via function)
create policy "admin_audit_logs_service_role" on admin_audit_logs
  for all using (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role')
  with check (current_setting('request.jwt.claims', true)::json ->> 'role' = 'service_role');






