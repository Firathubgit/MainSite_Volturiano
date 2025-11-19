# Supabase Debugging Guide for Sharing Feature

## Where to Check Activity in Supabase

### 1. Table Editor - View Share Links

**Location**: Supabase Dashboard → Table Editor → `garage_share_links`

**What to check**:
- See all created share links
- Check `share_code` values
- View `privacy` settings
- Check `expires_at` dates
- Monitor `access_count` (increments when link is accessed)
- See `last_accessed_at` timestamps
- View `created_at` timestamps

**Useful queries**:
```sql
-- See all share links
SELECT * FROM garage_share_links ORDER BY created_at DESC;

-- See share links for a specific garage item
SELECT * FROM garage_share_links 
WHERE garage_item_id = 'YOUR_ITEM_ID' 
ORDER BY created_at DESC;

-- See recently accessed links
SELECT * FROM garage_share_links 
WHERE last_accessed_at IS NOT NULL 
ORDER BY last_accessed_at DESC 
LIMIT 10;

-- See expired links
SELECT * FROM garage_share_links 
WHERE expires_at < NOW() 
ORDER BY expires_at DESC;
```

### 2. Logs - View Function Execution

**Location**: Supabase Dashboard → Logs → Postgres Logs

**What to check**:
- See `RAISE NOTICE` messages from RPC functions
- View function execution times
- Check for errors
- See parameter values passed to functions

**How to filter**:
- Search for: `create_share_link`, `get_shared_item`, `update_share_settings`
- Look for `NOTICE` level messages (these are our debug logs)

**Example log entries you'll see**:
```
NOTICE: create_share_link called: item_id=xxx, privacy=unlisted, expires_at=
NOTICE: create_share_link: User authenticated: xxx
NOTICE: create_share_link: Ownership verified
NOTICE: create_share_link: Generated share code: abc123xyz
NOTICE: create_share_link: Share link created: id=xxx, share_code=abc123xyz
```

### 3. API Logs - View HTTP Requests

**Location**: Supabase Dashboard → Logs → API Logs

**What to check**:
- See RPC function calls from frontend
- View request/response times
- Check for HTTP errors
- See request payloads

**Filter by**:
- Path: `/rest/v1/rpc/create_share_link`
- Path: `/rest/v1/rpc/get_shared_item`
- Path: `/rest/v1/rpc/update_share_settings`

### 4. Database Functions - Verify Functions Exist

**Location**: Supabase Dashboard → Database → Functions

**What to check**:
- Verify all 4 functions exist:
  - `generate_share_code()`
  - `create_share_link()`
  - `get_shared_item()`
  - `update_share_settings()`

**To test functions**:
```sql
-- Test generate_share_code (should return a 12-character code)
SELECT generate_share_code();

-- Test create_share_link (requires authentication)
-- This should be tested through the frontend, not directly
```

### 5. Row Level Security (RLS) - Check Policies

**Location**: Supabase Dashboard → Authentication → Policies → `garage_share_links`

**What to check**:
- Verify RLS is enabled
- Check that policies exist:
  - `garage_share_links_owner` (for CRUD operations)
  - `garage_share_links_public_read` (for public read access)

**To verify**:
```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'garage_share_links';

-- Check policies
SELECT * FROM pg_policies 
WHERE tablename = 'garage_share_links';
```

## Frontend Debug Logs

### Browser Console

Open Developer Tools (F12) → Console tab

**Log prefixes to look for**:
- `[ShareModal]` - Share modal component logs
- `[SharedGarageView]` - Shared view component logs
- `[API]` - API function logs
- `[GarageStore]` - Store method logs

### What You'll See

**When creating a share link**:
```
[ShareModal] handleCreateLink called
[ShareModal] Options: {privacy: "unlisted", expiresAt: null, showExpiry: false}
[ShareModal] Creating share link with options: {privacy: "unlisted", expiresAt: null}
[API] createShareLink called with itemId: xxx, options: {privacy: "unlisted", expiresAt: null}
[GarageStore] createShareLink called: {itemId: "xxx", options: {privacy: "unlisted", expiresAt: null}}
[API] Share link created successfully: {id: "xxx", share_code: "abc123xyz", ...}
[ShareModal] Share link created successfully: {id: "xxx", share_code: "abc123xyz", ...}
[ShareModal] Share code: abc123xyz
[ShareModal] Share URL: http://localhost:5173/garage/share/abc123xyz
```

**When accessing a shared link**:
```
[SharedGarageView] useEffect triggered with shareCode: abc123xyz
[SharedGarageView] Loading shared item...
[SharedGarageView] loadSharedItem called with shareCode: abc123xyz
[SharedGarageView] Calling fetchSharedItem API...
[API] fetchSharedItem called with shareCode: abc123xyz
[GarageStore] fetchSharedItem called: abc123xyz
[API] Shared item fetched successfully
[SharedGarageView] fetchSharedItem completed in 234 ms
[SharedGarageView] Shared item loaded successfully
[SharedGarageView] Item ID: xxx
[SharedGarageView] Item title: My Configuration
[SharedGarageView] Share link access count: 1
```

**When updating privacy**:
```
[ShareModal] handleUpdatePrivacy called: {shareLinkId: "xxx", newPrivacy: "public"}
[API] updateShareSettings called with shareLinkId: xxx, settings: {privacy: "public"}
[GarageStore] updateShareSettings called: {shareLinkId: "xxx", settings: {privacy: "public"}}
[ShareModal] updateShareSettings completed in 156 ms
[ShareModal] Privacy updated successfully: {...}
```

## Common Issues & Debugging

### Issue: Share link not created

**Check**:
1. Browser console for errors
2. Supabase Logs → Postgres Logs for function errors
3. Verify user is authenticated
4. Verify garage item exists and user owns it

**Debug query**:
```sql
-- Check if garage item exists
SELECT id, owner_id, archived_at 
FROM garage_items 
WHERE id = 'YOUR_ITEM_ID';
```

### Issue: Share link not accessible

**Check**:
1. Browser console for errors
2. Supabase Logs → Postgres Logs
3. Check if link is expired: `SELECT * FROM garage_share_links WHERE share_code = 'YOUR_CODE'`
4. Verify privacy setting (must be 'public' or 'unlisted')

**Debug query**:
```sql
-- Check share link status
SELECT 
  share_code,
  privacy,
  expires_at,
  expires_at < NOW() as is_expired,
  access_count
FROM garage_share_links 
WHERE share_code = 'YOUR_CODE';
```

### Issue: Access count not incrementing

**Check**:
1. Supabase Logs → Postgres Logs for `get_shared_item` function
2. Verify function is being called (check API logs)
3. Check if RLS policy allows the update

**Debug query**:
```sql
-- Check current access count
SELECT share_code, access_count, last_accessed_at 
FROM garage_share_links 
WHERE share_code = 'YOUR_CODE';
```

### Issue: RPC function errors

**Check**:
1. Supabase Logs → Postgres Logs
2. Look for `ERROR` level messages
3. Check function definition in Database → Functions

**Common errors**:
- `Not authenticated` - User not logged in
- `Item not found or access denied` - User doesn't own the item
- `Invalid privacy level` - Wrong privacy value passed
- `Share link not found or expired` - Link doesn't exist or expired

## Real-time Monitoring

### Set up a query to monitor activity:

```sql
-- Monitor recent share link activity
SELECT 
  sl.share_code,
  sl.privacy,
  sl.access_count,
  sl.last_accessed_at,
  sl.created_at,
  gi.title as item_title
FROM garage_share_links sl
JOIN garage_items gi ON gi.id = sl.garage_item_id
ORDER BY COALESCE(sl.last_accessed_at, sl.created_at) DESC
LIMIT 20;
```

### Monitor access patterns:

```sql
-- See which share links are most accessed
SELECT 
  share_code,
  privacy,
  access_count,
  last_accessed_at,
  created_at
FROM garage_share_links
WHERE access_count > 0
ORDER BY access_count DESC
LIMIT 10;
```

## Tips

1. **Keep browser console open** while testing to see all logs
2. **Check Supabase logs in real-time** while testing
3. **Use the Table Editor** to verify data is being created/updated
4. **Check RLS policies** if you get permission errors
5. **Verify function definitions** if RPC calls fail
6. **Use the debug queries** above to investigate issues

