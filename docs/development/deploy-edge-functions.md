# Deploy Edge Functions Guide

This guide explains how to deploy the `generate-pdf` Edge Function for Phase 2.11 PDF Export.

## Option 1: Using Supabase CLI (Recommended)

### Step 1: Install Supabase CLI

**Windows (PowerShell):**
```powershell
# Using npm (requires Node.js)
npm install -g supabase

# Or using Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**macOS:**
```bash
# Using Homebrew
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

**Linux:**
```bash
# Using npm
npm install -g supabase

# Or download binary from GitHub releases
# https://github.com/supabase/cli/releases
```

### Step 2: Verify Installation

```bash
supabase --version
```

You should see something like: `supabase 1.x.x`

### Step 3: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate. After successful login, you'll be authenticated.

### Step 4: Link Your Project

```bash
# Get your project reference ID from Supabase Dashboard
# Dashboard URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
supabase link --project-ref YOUR_PROJECT_REF
```

**To find your project reference:**
1. Go to your Supabase Dashboard
2. Select your project
3. Go to Settings → General
4. Copy the "Reference ID"

### Step 5: Deploy the Function

From the project root directory:

```bash
supabase functions deploy generate-pdf
```

The CLI will:
- Upload the function code
- Install dependencies
- Deploy to your Supabase project

### Step 6: Verify Deployment

1. Go to Supabase Dashboard → Edge Functions
2. You should see `generate-pdf` in the list
3. Test it by clicking "Invoke" or using the API

---

## Option 2: Using Supabase Dashboard (No CLI Required)

If you prefer not to use the CLI, you can deploy directly from the Dashboard:

### Step 1: Prepare Function Files

1. Navigate to `supabase/functions/generate-pdf/` in your project
2. Ensure all files are present:
   - `index.ts`
   - `deno.json`
   - `utils/` folder with all utility files

### Step 2: Create Function in Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click **"Create a new function"**
3. Name it: `generate-pdf`
4. Choose **"Deploy from local files"** or **"Write in dashboard"**

### Step 3: Upload Function Code

**If deploying from local files:**
- Zip the `supabase/functions/generate-pdf/` directory
- Upload the zip file

**If writing in dashboard:**
- Copy contents of `index.ts` into the editor
- Add utility files as separate files
- Configure dependencies in `deno.json`

### Step 4: Set Environment Variables

In the Edge Function settings, add these environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (from Settings → API)

**⚠️ Important:** Never expose the service role key in client-side code!

### Step 5: Deploy

Click **"Deploy"** or **"Save"** to deploy the function.

---

## Option 3: Using GitHub Actions (CI/CD)

If you want automated deployments, you can set up GitHub Actions:

```yaml
# .github/workflows/deploy-edge-functions.yml
name: Deploy Edge Functions

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - run: supabase functions deploy generate-pdf
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

---

## Troubleshooting

### CLI Not Found

If `supabase` command is not found after installation:

**Windows:**
- Restart PowerShell/Command Prompt
- Check if npm global bin is in your PATH: `npm config get prefix`

**macOS/Linux:**
- Restart terminal
- Check PATH: `echo $PATH`
- Verify installation: `which supabase`

### Authentication Issues

```bash
# Re-authenticate
supabase logout
supabase login
```

### Deployment Errors

**Common issues:**

1. **"Function not found"**
   - Ensure you're in the project root
   - Check function name matches exactly: `generate-pdf`

2. **"Missing dependencies"**
   - Verify `deno.json` has correct imports
   - Check that all utility files are in the correct paths

3. **"Permission denied"**
   - Ensure you're logged in: `supabase login`
   - Verify project link: `supabase link --project-ref YOUR_REF`

### Testing the Function

After deployment, test it:

```bash
# Using CLI
supabase functions invoke generate-pdf \
  --body '{"garage_item_id": "your-item-id", "options": {"watermark": false, "include_qr": true}}'

# Or use the Dashboard
# Edge Functions → generate-pdf → Invoke
```

---

## Next Steps

After successful deployment:

1. ✅ Function is live and accessible
2. ✅ Test PDF generation from the UI
3. ✅ Monitor function logs in Dashboard → Edge Functions → Logs
4. ✅ Check for any errors in the function execution

---

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Deno Runtime](https://deno.land/manual)


