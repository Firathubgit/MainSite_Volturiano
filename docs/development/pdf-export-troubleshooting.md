# PDF Export Troubleshooting Guide

## Current Issue: Function Invocation Hanging

The logs show the function is being called but stops after logging parameters. This suggests the Edge Function invocation is hanging or timing out.

## Immediate Debugging Steps

### 1. Check Network Tab
1. Open Browser DevTools (F12)
2. Go to **Network** tab
3. Click "Export PDF" button
4. Look for a request to `/functions/v1/generate-pdf`
5. Check:
   - **Status**: Is it pending, failed, or completed?
   - **Response**: What does it show?
   - **Headers**: Are auth headers being sent?

### 2. Check Edge Function Logs
1. Go to **Supabase Dashboard** → **Edge Functions** → **generate-pdf**
2. Click **"Logs"** tab
3. Look for:
   - Any error messages
   - Function initialization errors
   - Timeout errors
   - PDFKit import errors

### 3. Test Function Directly in Dashboard
1. Go to **Edge Functions** → **generate-pdf**
2. Click **"Invoke"** button
3. Use this payload (replace with real item ID):
```json
{
  "garage_item_id": "07d89c6f-29f0-4bce-a861-d79bca44f44f",
  "options": {
    "watermark": false,
    "include_qr": true
  }
}
```
4. Check if it works or shows errors

### 4. Check Database for Jobs
Run in Supabase SQL Editor:
```sql
SELECT * FROM pdf_export_jobs 
WHERE garage_item_id = '07d89c6f-29f0-4bce-a861-d79bca44f44f'
ORDER BY created_at DESC 
LIMIT 5;
```

This will tell us if:
- Jobs are being created
- What status they have
- Any error messages

## Common Causes

### PDFKit Import Issue
PDFKit might be failing to import. The function might be crashing during initialization.

**Check:** Edge Function logs for import errors

### Function Not Deployed Correctly
The function might not be fully deployed or has syntax errors.

**Check:** Dashboard → Edge Functions → generate-pdf → Check if it shows as "Active"

### Network/CORS Issue
The request might be blocked.

**Check:** Network tab for CORS errors

### Timeout
The function might be taking too long to respond.

**Check:** Edge Function logs for timeout errors

## Quick Fix: Simplify Function

If PDFKit is the issue, we can temporarily remove PDF generation and just return a test response to verify the function is being called.

## Next Steps

Please share:
1. What you see in the **Network** tab when clicking Export
2. What appears in **Edge Function Logs**
3. Results from the **database query** above
4. Any errors when **invoking directly** in Dashboard

This will help identify the exact issue!


