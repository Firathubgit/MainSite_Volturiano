# Supabase Setup Guide for Garage Feature

> **📊 Current Status:** See [`supabase-current-status.md`](./supabase-current-status.md) for up-to-date setup status and what's been completed.

# Supabase Setup Guide for Garage Feature

## Step 1: Run SQL Schema Migration

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor** (left sidebar)

2. **Execute the Schema Script**
   - Open `supabase/sql/garage_schema.sql` from your project
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **Run** (or press Ctrl+Enter)

3. **Verify Tables Created**
   - Go to **Table Editor** (left sidebar)
   - You should see these new tables:
     - `garage_items`
     - `garage_versions`
     - `garage_item_tags`
     - `garage_milestones`
     - `garage_activity`
     - `test_drive_requests`
     - `model_subscriptions`
     - `model_launches`

4. **Verify RLS Policies**
   - In **Table Editor**, click on `garage_items`
   - Click **Policies** tab
   - You should see `garage_items_owner_access` policy
   - Repeat for other tables to verify RLS is enabled

## Step 2: Enable Realtime for Garage Tables

1. **Navigate to Replication Settings**
   - Go to **Database** → **Replication** (left sidebar)
   - Or use URL: `https://app.supabase.com/project/[YOUR_PROJECT]/database/replication`

2. **Enable Replication for `garage_items`**
   - Find `garage_items` in the list
   - Toggle the switch to **ON**
   - This enables real-time updates for garage items

3. **Optional: Enable Replication for `garage_versions`**
   - If you want real-time version history updates, enable this too
   - For now, `garage_items` is sufficient

## Step 3: Verify Profiles Table Exists

1. **Check if `profiles` table exists**
   - Go to **Table Editor**
   - Look for `profiles` table
   - If it doesn't exist, run this SQL:

```sql
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  locale text default 'en',
  avatar_url text,
  preferences jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles_owner_access" on profiles
  using (id = auth.uid())
  with check (id = auth.uid());
```

## Step 4: Test RLS (Optional but Recommended)

1. **Create a Test User**
   - Go to **Authentication** → **Users**
   - Click **Add User** → **Create new user**
   - Create a test account (e.g., `test@example.com`)

2. **Test Query Access**
   - In SQL Editor, run:
   ```sql
   -- This should return empty (no items for this user yet)
   select * from garage_items;
   ```
   - The RLS policy ensures users only see their own items

3. **Test Insert (as authenticated user)**
   - Use Supabase client in your app or SQL with proper auth context
   - Insert a test garage item and verify it appears

## Step 5: Create Storage Bucket (Optional - for thumbnails)

1. **Navigate to Storage**
   - Go to **Storage** (left sidebar)
   - Click **New bucket**

2. **Create `garage-thumbnails` bucket**
   - Name: `garage-thumbnails`
   - Public: **OFF** (private bucket)
   - File size limit: 5MB (adjust as needed)
   - Allowed MIME types: `image/jpeg,image/png,image/webp`

3. **Set Storage Policies**
   - Click on the bucket → **Policies**
   - Add policy: "Users can upload their own thumbnails"
   ```sql
   create policy "Users can upload own thumbnails"
   on storage.objects for insert
   with check (
     bucket_id = 'garage-thumbnails' and
     auth.uid()::text = (storage.foldername(name))[1]
   );

   create policy "Users can read own thumbnails"
   on storage.objects for select
   using (
     bucket_id = 'garage-thumbnails' and
     auth.uid()::text = (storage.foldername(name))[1]
   );
   ```

## Verification Checklist

- [ ] All tables created successfully
- [ ] RLS policies active on all tables
- [ ] Realtime enabled for `garage_items`
- [ ] `profiles` table exists and has RLS
- [ ] Storage bucket created (if using thumbnails)
- [ ] Test user can only see their own items

## Troubleshooting

**Error: "relation profiles does not exist"**
- Run the profiles table creation SQL from Step 3

**Error: "permission denied for table garage_items"**
- Check that RLS policies are created correctly
- Verify you're authenticated when testing

**Realtime not working**
- Ensure replication is enabled in Database → Replication
- Check that your Supabase client has realtime enabled: `supabase.realtime.setChannel(...)`

## Next Steps

After completing this setup:
1. The frontend code will connect to these tables
2. Test creating a garage item via the UI
3. Verify real-time updates work (open two browser tabs)

