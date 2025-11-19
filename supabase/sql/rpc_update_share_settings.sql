-- RPC Function: update_share_settings
-- Run this in Supabase SQL Editor
-- Updates privacy and expiry settings for a share link

create or replace function update_share_settings(
  p_share_link_id uuid,
  p_privacy text default null,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_result jsonb;
begin
  -- Debug: Log function call
  raise notice 'update_share_settings called: share_link_id=%, privacy=%, expires_at=%', 
    p_share_link_id, p_privacy, p_expires_at;
  
  v_user_id := auth.uid();
  if v_user_id is null then
    raise notice 'update_share_settings: Not authenticated';
    raise exception 'Not authenticated';
  end if;
  
  raise notice 'update_share_settings: User authenticated: %', v_user_id;
  
  -- Verify ownership
  if not exists (
    select 1 from garage_share_links sl
    join garage_items gi on gi.id = sl.garage_item_id
    where sl.id = p_share_link_id
      and gi.owner_id = v_user_id
  ) then
    raise notice 'update_share_settings: Share link not found or access denied: share_link_id=%, user_id=%', 
      p_share_link_id, v_user_id;
    raise exception 'Share link not found or access denied';
  end if;
  
  raise notice 'update_share_settings: Ownership verified';
  
  -- Validate privacy if provided
  if p_privacy is not null and p_privacy not in ('public', 'private', 'unlisted') then
    raise notice 'update_share_settings: Invalid privacy level: %', p_privacy;
    raise exception 'Invalid privacy level';
  end if;
  
  -- Update settings
  update garage_share_links
  set privacy = coalesce(p_privacy, privacy),
      expires_at = p_expires_at
  where id = p_share_link_id;
  
  raise notice 'update_share_settings: Settings updated';
  
  -- Return updated link
  select row_to_json(sl.*)::jsonb into v_result
  from garage_share_links sl
  where sl.id = p_share_link_id;
  
  raise notice 'update_share_settings: Returning updated link';
  return v_result;
end;
$$;

