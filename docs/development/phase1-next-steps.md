# Phase 1: Next Steps Guide

## Current Status

You've completed:
- ✅ **1.1 Core Schema** - Tables created (vehicles, vehicle_options, configurations, orders, etc.)
- ✅ **1.2 RLS Policies** - Security policies implemented
- ⚠️ **1.3 Storage Buckets** - Partially done (renders bucket attempted, others missing)
- ⚠️ **1.4 RPC Functions** - Partially done (get_configuration_totals exists, others missing)
- ❌ **1.5 Seed Data** - Not started (seed file exists but needs fixing)
- ❌ **1.6 Migration Workflow** - Not started

## Next Part: Complete Phase 1.3 (Storage Buckets)

**Priority:** High  
**Estimated Time:** 2 days  
**Dependencies:** None

### Step 1: Verify/Create Storage Buckets

You have two options:

#### Option A: Via Supabase Dashboard (Easier)

1. Go to your Supabase Dashboard
2. Navigate to **Storage** (left sidebar)
3. For each bucket below, click **New bucket**:

**Bucket 1: `renders`**
- Name: `renders`
- Public: **OFF** (private)
- File size limit: 10MB
- Allowed MIME types: `image/jpeg,image/png,image/webp`

**Bucket 2: `models`**
- Name: `models`
- Public: **OFF** (private)
- File size limit: 100MB
- Allowed MIME types: `model/gltf-binary,image/ktx2,image/hdr`

**Bucket 3: `garage-thumbnails`**
- Name: `garage-thumbnails`
- Public: **OFF** (private)
- File size limit: 5MB
- Allowed MIME types: `image/jpeg,image/png,image/webp`

**Bucket 4: `documents`**
- Name: `documents`
- Public: **OFF** (private)
- File size limit: 10MB
- Allowed MIME types: `application/pdf,image/*`

#### Option B: Via SQL (More Automated)

Add this to `supabase/sql/platform_schema.sql` after the existing storage bucket code:

```sql
-- Storage bucket setup (complete)
do $$ begin
  -- Renders bucket
  perform storage.create_bucket('renders', false, false);
exception when others then null;
end $$;

do $$ begin
  -- Models bucket
  perform storage.create_bucket('models', false, false);
exception when others then null;
end $$;

do $$ begin
  -- Garage thumbnails bucket
  perform storage.create_bucket('garage-thumbnails', false, false);
exception when others then null;
end $$;

do $$ begin
  -- Documents bucket
  perform storage.create_bucket('documents', false, false);
exception when others then null;
end $$;
```

### Step 2: Create Storage Policies

Add storage RLS policies. Create a new file `supabase/sql/storage_policies.sql`:

```sql
-- Storage bucket policies for Phase 1

-- Renders bucket: Signed URLs only (no direct access)
-- Users request signed URLs via Edge Function or RPC

-- Models bucket: Signed URLs only
-- Same as renders

-- Garage thumbnails: Owner can upload/read their own
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

-- Documents bucket: Owner can upload/read their own
create policy "Users can upload own documents"
on storage.objects for insert
with check (
  bucket_id = 'documents' and
  auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can read own documents"
on storage.objects for select
using (
  bucket_id = 'documents' and
  auth.uid()::text = (storage.foldername(name))[1]
);
```

Run this SQL in Supabase SQL Editor.

### Step 3: Create Storage Utility

Create `web/src/lib/storage.js`:

```javascript
import { supabase } from './supabaseClient';

/**
 * Generate a signed URL for a storage file
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @param {number} expiresIn - Expiry in seconds (default 3600 = 1 hour)
 * @returns {Promise<string|null>} Signed URL or null on error
 */
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  if (!supabase) return null;
  
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    
    if (error) {
      console.error(`[Storage] Error creating signed URL for ${bucket}/${path}:`, error);
      return null;
    }
    
    return data?.signedUrl || null;
  } catch (err) {
    console.error('[Storage] Unexpected error:', err);
    return null;
  }
}

/**
 * Upload a file to storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path (include user ID folder)
 * @param {File} file - File to upload
 * @returns {Promise<{path: string, error: Error|null}>}
 */
export async function uploadFile(bucket, path, file) {
  if (!supabase) {
    return { path: null, error: new Error('Supabase client not initialized') };
  }
  
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error(`[Storage] Upload error for ${bucket}/${path}:`, error);
      return { path: null, error };
    }
    
    return { path: data?.path || null, error: null };
  } catch (err) {
    console.error('[Storage] Unexpected upload error:', err);
    return { path: null, error: err };
  }
}

/**
 * Delete a file from storage
 * @param {string} bucket - Bucket name
 * @param {string} path - File path
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFile(bucket, path) {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) {
      console.error(`[Storage] Delete error for ${bucket}/${path}:`, error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('[Storage] Unexpected delete error:', err);
    return false;
  }
}
```

## After Storage Buckets: Complete Phase 1.4 (RPC Functions)

### Missing RPC Functions

You need to add these two functions:

#### 1. `check_compatibility`

Add to `supabase/sql/platform_schema.sql`:

```sql
-- Compatibility check RPC
create or replace function check_compatibility(selected_options jsonb)
returns table (
  rule_id uuid,
  rule_type text,
  primary_option_id uuid,
  secondary_option_id uuid,
  message_key text,
  auto_resolve boolean
) as $$
  -- Note: This requires compatibility_rules table
  -- For now, return empty if table doesn't exist
  select 
    cr.id as rule_id,
    cr.rule_type::text,
    cr.primary_option_value_id as primary_option_id,
    cr.secondary_option_value_id as secondary_option_id,
    cr.message_key,
    cr.auto_resolve
  from compatibility_rules cr
  where cr.primary_option_value_id = any(
    select jsonb_array_elements_text(selected_options::jsonb)
  )
  or cr.secondary_option_value_id = any(
    select jsonb_array_elements_text(selected_options::jsonb)
  );
$$ language sql stable;

grant execute on function check_compatibility(jsonb) to authenticated;
```

**Note:** This requires a `compatibility_rules` table. If you don't have it yet, you can create a stub version that returns empty results.

#### 2. `generate_config_code`

Add to `supabase/sql/platform_schema.sql`:

```sql
-- Config code generation RPC
create or replace function generate_config_code(config_id uuid)
returns text as $$
declare
  new_code text;
  exists_check boolean;
begin
  loop
    -- Generate 8-character alphanumeric code
    new_code := upper(
      substring(
        encode(gen_random_bytes(6), 'base64') 
        from 1 for 8
      )
    );
    
    -- Remove special characters, keep only A-Z0-9
    new_code := regexp_replace(new_code, '[^A-Z0-9]', '', 'g');
    
    -- Check uniqueness
    select exists(
      select 1 from configurations 
      where id != config_id 
      and title = new_code  -- Using title as placeholder for config_code column
    ) into exists_check;
    
    -- If unique, update and return
    if not exists_check then
      update configurations
      set title = new_code  -- Update this to use actual config_code column when added
      where id = config_id;
      
      return new_code;
    end if;
  end loop;
end;
$$ language plpgsql volatile;

grant execute on function generate_config_code(uuid) to authenticated;
```

**Note:** This assumes you'll add a `config_code` column to `configurations` table. For now, it uses `title` as a placeholder.

## After RPC Functions: Fix Seed Data (Phase 1.5)

### Fix platform_seed.sql

The seed file references `account_profiles` but your schema uses `profiles`. Update `supabase/seeds/platform_seed.sql`:

1. Change line 18: `insert into account_profiles` → `insert into profiles`
2. Run the seed file in Supabase SQL Editor

## Verification

After completing each step, run the diagnostic script:

```javascript
import('./src/debug/checkPhase1Status.js').then(m => m.checkPhase1Status());
```

This will show you exactly what's remaining.

## Summary: Next 3 Steps

1. **Storage Buckets** (2 days) - Create 4 buckets + policies + utility
2. **RPC Functions** (1 day) - Add 2 missing functions
3. **Seed Data** (1 day) - Fix and run seed file

**Total:** ~4 days to complete Phase 1

Then you can move to **Phase 2** (Garage integration) or **Phase 3** (Configurator 2D).

