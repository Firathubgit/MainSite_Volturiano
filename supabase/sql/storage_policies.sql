-- Storage bucket policies for Phase 1
-- Run this AFTER creating the buckets
-- This script is idempotent - safe to run multiple times

-- Renders bucket: Signed URLs only (no direct RLS needed, Edge Functions will handle)
-- Users request signed URLs via Edge Function or RPC
-- No policies needed - access controlled via signed URLs

-- Models bucket: Signed URLs only (same as renders)
-- No direct RLS needed
-- No policies needed - access controlled via signed URLs

-- Garage thumbnails: Owner can upload/read their own
-- Files should be stored as: {user_id}/{filename}
drop policy if exists "Users can upload own thumbnails" on storage.objects;
create policy "Users can upload own thumbnails"
on storage.objects for insert
with check (
  bucket_id = 'garage-thumbnails' and
  auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can read own thumbnails" on storage.objects;
create policy "Users can read own thumbnails"
on storage.objects for select
using (
  bucket_id = 'garage-thumbnails' and
  auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own thumbnails" on storage.objects;
create policy "Users can update own thumbnails"
on storage.objects for update
using (
  bucket_id = 'garage-thumbnails' and
  auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own thumbnails" on storage.objects;
create policy "Users can delete own thumbnails"
on storage.objects for delete
using (
  bucket_id = 'garage-thumbnails' and
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Documents bucket: Owner can upload/read their own
-- Files should be stored as: {user_id}/{filename}
drop policy if exists "Users can upload own documents" on storage.objects;
create policy "Users can upload own documents"
on storage.objects for insert
with check (
  bucket_id = 'documents' and
  auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can read own documents" on storage.objects;
create policy "Users can read own documents"
on storage.objects for select
using (
  bucket_id = 'documents' and
  auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own documents" on storage.objects;
create policy "Users can update own documents"
on storage.objects for update
using (
  bucket_id = 'documents' and
  auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own documents" on storage.objects;
create policy "Users can delete own documents"
on storage.objects for delete
using (
  bucket_id = 'documents' and
  auth.uid()::text = (storage.foldername(name))[1]
);

