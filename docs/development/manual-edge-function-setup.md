# Manual Edge Function Setup Guide

This guide explains how to set up the `generate-pdf` Edge Function manually through the Supabase Dashboard.

## Step 1: Get Your API Credentials

1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** → **API** (in the left sidebar)
3. You'll see:
   - **Project URL** - This is your `SUPABASE_URL` (automatically provided)
   - **service_role key** (secret) - This is what you'll add as a secret
     - ⚠️ **Important:** Click "Reveal" to show the service_role key
     - Copy this value (you'll need it in Step 3)

## Step 2: Create the Edge Function

1. In Supabase Dashboard, go to **Edge Functions** (in the left sidebar)
2. Click **"Create a new function"** or **"New Function"**
3. Name it: `generate-pdf`
4. Choose **"Write in dashboard"** or **"Deploy from files"**

## Step 3: Add Environment Variables/Secrets

### ⚠️ Important: Secret Naming Restriction

Supabase **does not allow** secret names that start with `SUPABASE_` prefix. You must use a different name.

### Add the Service Role Key Secret

1. In the Edge Function editor, go to **"Secrets"** or **"Settings"** section
2. Click **"Add Secret"** or **"Manage Secrets"**
3. Add the following secret:

   **Name:** `SERVICE_ROLE_KEY` (⚠️ NOT `SUPABASE_SERVICE_ROLE_KEY`)  
   **Value:** (paste your service_role key from Step 1)

4. Click **"Save"**

### About SUPABASE_URL

The `SUPABASE_URL` is **automatically provided** by Supabase to all Edge Functions. You don't need to set it manually - it's available as `Deno.env.get('SUPABASE_URL')` automatically.

If for some reason you need to set it manually (not recommended), you can use:
- **Name:** `SUPABASE_PROJECT_URL` (not `SUPABASE_URL`)
- **Value:** (your Project URL from Settings → API)

## Step 4: Upload Function Code

### If using "Write in dashboard":

1. Copy the contents of `supabase/functions/generate-pdf/index.ts`
2. Paste into the main editor
3. You'll also need to add the utility files:
   - Create a file for `utils/pdf-template.ts`
   - Create a file for `utils/qr-generator.ts`
   - Create a file for `utils/image-loader.ts`
   - Create a file for `_shared/supabase-client.ts`

### If using "Deploy from files":

1. Zip the entire `supabase/functions/generate-pdf/` directory
2. Upload the zip file
3. The dashboard should extract and deploy it

## Step 5: Configure Dependencies

The function needs a `deno.json` file with dependencies. If deploying manually, you may need to:

1. Create a `deno.json` file in the function:
```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.39.3",
    "pdfkit": "https://cdn.skypack.dev/pdfkit@0.13.0?dts",
    "qrcode": "https://deno.land/x/qrcode@v2.0.0/mod.ts"
  },
  "compilerOptions": {
    "lib": ["deno.window", "deno.unstable"]
  }
}
```

2. Or add imports directly in the code (Deno will fetch them automatically)

## Step 6: Deploy

1. Click **"Deploy"** or **"Save"** button
2. Wait for deployment to complete
3. You should see a success message

## Step 7: Verify Setup

1. Go to **Edge Functions** → `generate-pdf`
2. Check the **"Logs"** tab to see if there are any errors
3. Test the function using the **"Invoke"** button with this payload:

```json
{
  "garage_item_id": "your-test-item-id",
  "options": {
    "watermark": false,
    "include_qr": true
  }
}
```

## Troubleshooting

### "Name must not start with the SUPABASE_ prefix" Error

✅ **Solution:** Use `SERVICE_ROLE_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`

Supabase doesn't allow secrets starting with `SUPABASE_` because those are reserved. The code has been updated to check for `SERVICE_ROLE_KEY` first, then fall back to `SUPABASE_SERVICE_ROLE_KEY` if available.

### "Missing Supabase environment variables" Error

This means `SERVICE_ROLE_KEY` is not set. Make sure:
- ✅ You added it as a **Secret** (not just a comment in code)
- ✅ The secret name is exactly: `SERVICE_ROLE_KEY` (case-sensitive, no `SUPABASE_` prefix)
- ✅ You saved/deployed after adding the secret
- ✅ The value is your **service_role** key (not anon key)

### "Function not found" or Import Errors

- Make sure all utility files are uploaded
- Check that file paths match exactly (case-sensitive)
- Verify `_shared/supabase-client.ts` is accessible

### "Permission denied" Errors

- Verify the `SERVICE_ROLE_KEY` is correct
- Check that it's the **service_role** key (not anon key)
- Ensure the key hasn't been rotated/changed

## Quick Reference: Where to Find Values

**Service Role Key:**
- Dashboard → Settings → API → **service_role** key (click "Reveal")

**Function Secrets:**
- Edge Functions → `generate-pdf` → **Secrets** or **Settings** tab
- Add secret: **Name:** `SERVICE_ROLE_KEY`, **Value:** (your service_role key)

**SUPABASE_URL:**
- Automatically provided by Supabase (no need to set manually)

---

## Alternative: Using Supabase CLI (Easier)

If manual setup is too complex, consider using the CLI:

```bash
# Install CLI
npm install -g supabase

# Login and link
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy (automatically handles secrets)
supabase functions deploy generate-pdf
```

The CLI automatically handles environment variables and secrets!
