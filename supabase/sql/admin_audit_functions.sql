-- Admin Audit Logging Functions
-- Functions for logging admin actions to audit trail

-- Function: Log an admin action
create or replace function log_admin_action(
  p_action text,
  p_resource_type text,
  p_resource_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns uuid as $$
declare
  v_log_id uuid;
  v_admin_id uuid;
  v_ip_address inet;
  v_user_agent text;
begin
  -- Get current admin user ID
  v_admin_id := auth.uid();
  
  -- Try to get IP address from request headers
  begin
    v_ip_address := inet_client_addr();
  exception
    when others then
      v_ip_address := null;
  end;
  
  -- Try to get user agent from request headers
  begin
    v_user_agent := current_setting('request.headers', true)::json->>'user-agent';
  exception
    when others then
      v_user_agent := null;
  end;
  
  -- Insert audit log entry
  insert into admin_audit_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  )
  values (
    v_admin_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    v_ip_address,
    v_user_agent
  )
  returning id into v_log_id;
  
  return v_log_id;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users (will be checked by RLS)
grant execute on function log_admin_action(text, text, uuid, jsonb) to authenticated;















