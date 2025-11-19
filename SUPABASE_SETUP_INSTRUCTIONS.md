# Supabase Setup Instructions for Sharing & Deep Links

## Overview
This document contains all SQL scripts that need to be run in Supabase SQL Editor to enable the sharing functionality.

## Step-by-Step Instructions

### 1. Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### 2. Run Schema Script (First)
Copy and paste the entire contents of `supabase/sql/garage_share_links_schema.sql` into the SQL Editor and click **Run**.

This script:
- Creates the `garage_share_links` table
- Creates indexes for performance
- Sets up RLS (Row Level Security) policies
- Creates the `generate_share_code()` helper function

**Expected result**: Should see "Success. No rows returned" or similar success message.

### 3. Run RPC Functions (One by One)

Run each of these scripts **separately** in order:

#### 3.1 Create Share Link RPC
Copy and paste the entire contents of `supabase/sql/rpc_create_share_link.sql` and click **Run**.

**Expected result**: Function created successfully.

#### 3.2 Get Shared Item RPC
Copy and paste the entire contents of `supabase/sql/rpc_get_shared_item.sql` and click **Run**.

**Expected result**: Function created successfully.

#### 3.3 Update Share Settings RPC
Copy and paste the entire contents of `supabase/sql/rpc_update_share_settings.sql` and click **Run**.

**Expected result**: Function created successfully.

### 4. Verify Setup

Run this query to verify everything is set up correctly:

```sql
-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'garage_share_links'
);

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('generate_share_code', 'create_share_link', 'get_shared_item', 'update_share_settings');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'garage_share_links';
```

All should return `true` or show the expected functions/tables.

### 5. Test (Optional)

You can test the functions manually:

```sql
-- Test generate_share_code (should return a 12-character code)
SELECT generate_share_code();

-- Note: To test create_share_link, you need to be authenticated
-- This will be tested through the frontend application
```

## Files to Run

1. ✅ `supabase/sql/garage_share_links_schema.sql` - **Run this first**
2. ✅ `supabase/sql/rpc_create_share_link.sql` - **Run second**
3. ✅ `supabase/sql/rpc_get_shared_item.sql` - **Run third**
4. ✅ `supabase/sql/rpc_update_share_settings.sql` - **Run fourth**

## Important Notes

- **Order matters**: Run the schema script first, then the RPC functions
- **RLS Policies**: The RLS policies ensure that:
  - Only owners can create/manage share links for their items
  - Public/unlisted links can be read by anyone (via share code)
  - Private links cannot be shared
- **Security**: Share codes are cryptographically random and unguessable
- **Expiry**: Expired links are automatically filtered out by the RLS policies

## Troubleshooting

### Error: "relation garage_share_links does not exist"
- Make sure you ran `garage_share_links_schema.sql` first

### Error: "function generate_share_code() does not exist"
- Make sure you ran `garage_share_links_schema.sql` which includes this function

### Error: "permission denied"
- Check that RLS policies were created correctly
- Verify you're running the scripts as a database admin/superuser

### Error: "function already exists"
- This is okay - the scripts use `CREATE OR REPLACE FUNCTION`
- You can safely re-run them

## After Setup

Once all scripts are run successfully:
1. The frontend application can now create share links
2. Users can share their garage configurations
3. Shared links will be accessible at `/garage/share/:shareCode`
4. Share links respect privacy settings and expiry dates

## Next Steps

After running all SQL scripts:
1. Restart your development server if needed
2. Test creating a share link from a garage item
3. Test accessing a shared link (logged out)
4. Test saving a shared configuration to your garage

