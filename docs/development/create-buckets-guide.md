# How to Create Storage Buckets in Supabase

## Why SQL Doesn't Work

Supabase storage buckets **cannot be created via SQL**. They must be created through:
1. **Dashboard UI** (easiest)
2. **REST API** (for automation)
3. **Supabase CLI** (if available)

## Method 1: Via Dashboard (Recommended)

### Step 1: Navigate to Storage
1. Open your Supabase Dashboard
2. Click **Storage** in the left sidebar
3. Click **Buckets** tab (should be selected by default)

### Step 2: Create "renders" Bucket
1. Click **"+ New bucket"** button (green button, top right)
2. Fill in the form:
   - **Name**: `renders`
   - **Public bucket**: **OFF** (unchecked - this makes it private)
   - **File size limit**: `10` MB
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp`
3. Click **Create bucket**

### Step 3: Create "garage-thumbnails" Bucket
1. Click **"+ New bucket"** again
2. Fill in the form:
   - **Name**: `garage-thumbnails`
   - **Public bucket**: **OFF** (unchecked)
   - **File size limit**: `5` MB
   - **Allowed MIME types**: `image/jpeg,image/png,image/webp`
3. Click **Create bucket**

### Step 4: Verify Buckets Created
You should now see both buckets in your list:
- ✅ `renders`
- ✅ `garage-thumbnails`

## Method 2: Via REST API (For Automation)

If you need to automate this, you can use the Supabase Management API:

```bash
# Get your project reference and access token from Supabase Dashboard
# Settings → API → Project API keys → service_role key

curl -X POST 'https://api.supabase.com/v1/projects/{project_ref}/storage/buckets' \
  -H "Authorization: Bearer {service_role_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "renders",
    "public": false,
    "file_size_limit": 10485760,
    "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"]
  }'
```

## After Creating Buckets

Once buckets are created, run the storage policies SQL:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/sql/storage_policies.sql
```

This sets up RLS policies so users can only access their own files in `garage-thumbnails` and `documents` buckets.

## Troubleshooting

**Error: "Bucket already exists"**
- The bucket is already created, you can skip it

**Error: "Permission denied"**
- Make sure you're using the correct project and have admin access

**Buckets created but can't upload files**
- Run `storage_policies.sql` to set up RLS policies
- Check that you're authenticated when trying to upload

