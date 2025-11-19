-- RPC Function: create_share_link
-- Run this in Supabase SQL Editor
-- Creates a share link for a garage item

create or replace function create_share_link(
  p_garage_item_id uuid,
  p_privacy text default 'unlisted',
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_share_code text;
  v_link_id uuid;
  v_result jsonb;
begin
  -- Debug: Log function call
  raise notice 'create_share_link called: item_id=%, privacy=%, expires_at=%', 
    p_garage_item_id, p_privacy, p_expires_at;
  
  -- Verify authentication
  v_user_id := auth.uid();
  if v_user_id is null then
    raise notice 'create_share_link: Not authenticated';
    raise exception 'Not authenticated';
  end if;
  
  raise notice 'create_share_link: User authenticated: %', v_user_id;
  
  -- Verify ownership
  if not exists (
    select 1 from garage_items
    where id = p_garage_item_id
      and owner_id = v_user_id
      and archived_at is null
  ) then
    raise notice 'create_share_link: Item not found or access denied: item_id=%, user_id=%', 
      p_garage_item_id, v_user_id;
    raise exception 'Item not found or access denied';
  end if;
  
  raise notice 'create_share_link: Ownership verified';
  
  -- Validate privacy level
  if p_privacy not in ('public', 'private', 'unlisted') then
    raise notice 'create_share_link: Invalid privacy level: %', p_privacy;
    raise exception 'Invalid privacy level';
  end if;
  
  -- Generate unique share code
  v_share_code := generate_share_code();
  raise notice 'create_share_link: Generated share code: %', v_share_code;
  
  -- Create share link
  insert into garage_share_links (
    garage_item_id,
    share_code,
    privacy,
    expires_at,
    created_by
  ) values (
    p_garage_item_id,
    v_share_code,
    p_privacy,
    p_expires_at,
    v_user_id
  )
  returning id into v_link_id;
  
  raise notice 'create_share_link: Share link created: id=%, share_code=%', v_link_id, v_share_code;
  
  -- Return result
  select jsonb_build_object(
    'id', v_link_id,
    'share_code', v_share_code,
    'privacy', p_privacy,
    'expires_at', p_expires_at,
    'created_at', now()
  ) into v_result;
  
  return v_result;
end;
$$;

