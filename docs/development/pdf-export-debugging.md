# PDF Export Debugging Guide

## Quick Debugging Steps

### 1. Check Browser Console

Open your browser's Developer Tools (F12) and look for:
- `[API] createPdfExportJob called` - Should appear when you click export
- `[API] Edge Function error:` - Any errors from the function
- `[GarageStore] createPdfExport` - Store-level logs

### 2. Check Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **generate-pdf**
2. Click on **"Logs"** tab
3. Look for errors or warnings
4. Check the most recent invocations

### 3. Common Issues

#### Issue: "Function not found" or 404
**Solution:** 
- Verify function name is exactly `generate-pdf` (case-sensitive)
- Check function is deployed in Dashboard → Edge Functions

#### Issue: "Unauthorized" or 401
**Solution:**
- Check user is logged in
- Verify `SERVICE_ROLE_KEY` secret is set correctly
- Check Edge Function logs for auth errors

#### Issue: "Missing garage_item_id"
**Solution:**
- Check `itemId` is being passed correctly from `PdfExportButton`
- Verify the garage item exists and user owns it

#### Issue: PDF generation fails silently
**Solution:**
- Check Edge Function logs for PDFKit errors
- Verify `documents` bucket exists and has correct policies
- Check if PDFKit dependencies are loading correctly

#### Issue: Job created but status never updates
**Solution:**
- Check `PdfJobStatus` component is polling correctly
- Verify `getPdfJobStatus` API function is working
- Check database for job status in `pdf_export_jobs` table

### 4. Test Edge Function Directly

In Supabase Dashboard → Edge Functions → generate-pdf → Invoke:

```json
{
  "garage_item_id": "your-test-item-id",
  "options": {
    "watermark": false,
    "include_qr": true
  }
}
```

### 5. Check Database

Run this query in Supabase SQL Editor:

```sql
SELECT * FROM pdf_export_jobs 
ORDER BY created_at DESC 
LIMIT 10;
```

Check:
- Are jobs being created?
- What's the `status` field?
- Is there an `error_message`?
- Is `output_url` populated when status is 'completed'?

### 6. Verify Storage Bucket

1. Go to **Storage** → **Buckets**
2. Verify `documents` bucket exists
3. Check bucket policies are set correctly
4. Try uploading a test file manually

### 7. Check Network Tab

In browser DevTools → Network tab:
- Look for request to `/functions/v1/generate-pdf`
- Check response status code
- Check response body for error messages

## Debugging Checklist

- [ ] Edge Function is deployed and visible in Dashboard
- [ ] `SERVICE_ROLE_KEY` secret is set
- [ ] User is authenticated
- [ ] Garage item exists and user owns it
- [ ] `documents` bucket exists
- [ ] Storage policies are set
- [ ] Browser console shows no errors
- [ ] Edge Function logs show function is being called
- [ ] Job is created in `pdf_export_jobs` table
- [ ] PDF file appears in storage bucket (if job completed)


