-- RPC Function: get_shared_item
-- Run this in Supabase SQL Editor
-- Retrieves a shared garage item by share code (public access)

create or replace function get_shared_item(p_share_code text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_link record;
  v_item record;
  v_result jsonb;
begin
  -- Debug: Log function call
  raise notice 'get_shared_item called: share_code=%', p_share_code;
  
  -- Get share link
  select * into v_link
  from garage_share_links
  where share_code = p_share_code
    and privacy in ('public', 'unlisted')
    and (expires_at is null or expires_at > now());
  
  if not found then
    raise notice 'get_shared_item: Share link not found or expired: share_code=%', p_share_code;
    raise exception 'Share link not found or expired';
  end if;
  
  raise notice 'get_shared_item: Share link found: id=%, privacy=%, access_count=%', 
    v_link.id, v_link.privacy, v_link.access_count;
  
  -- Get garage item
  select * into v_item
  from garage_items
  where id = v_link.garage_item_id
    and archived_at is null;
  
  if not found then
    raise notice 'get_shared_item: Garage item not found: item_id=%', v_link.garage_item_id;
    raise exception 'Item not found';
  end if;
  
  raise notice 'get_shared_item: Garage item found: id=%, title=%', v_item.id, v_item.title;
  
  -- Increment access count
  update garage_share_links
  set access_count = access_count + 1,
      last_accessed_at = now()
  where id = v_link.id;
  
  raise notice 'get_shared_item: Access count incremented to %', v_link.access_count + 1;
  
  -- Build result
  select jsonb_build_object(
    'item', row_to_json(v_item),
    'share_link', jsonb_build_object(
      'share_code', v_link.share_code,
      'privacy', v_link.privacy,
      'access_count', v_link.access_count + 1,
      'created_at', v_link.created_at
    )
  ) into v_result;
  
  raise notice 'get_shared_item: Returning result successfully';
  return v_result;
end;
$$;

