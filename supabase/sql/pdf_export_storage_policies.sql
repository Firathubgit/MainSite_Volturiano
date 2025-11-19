-- PDF Export Storage Policies
-- Run this in Supabase SQL Editor
-- This creates storage policies for the documents bucket
-- NOTE: You must create the 'documents' bucket in Supabase Dashboard first:
-- 1. Go to Storage > Buckets
-- 2. Click "New bucket"
-- 3. Name: "documents"
-- 4. Public: No (private)
-- 5. File size limit: 10MB
-- 6. Allowed MIME types: application/pdf

-- Policy: Users can upload PDFs to their own folder
drop policy if exists "documents_upload_owner" on storage.objects;
create policy "documents_upload_owner" on storage.objects
  for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can view their own PDFs
drop policy if exists "documents_select_owner" on storage.objects;
create policy "documents_select_owner" on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own PDFs
drop policy if exists "documents_delete_owner" on storage.objects;
create policy "documents_delete_owner" on storage.objects
  for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


