import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUB_SITES_PATH = path.join(__dirname, 'pub_sites');

console.log('\n==========================================================');
console.log('🚀 VOLTURIANO BUILDER SERVER: AI STABILITY FIXES ACTIVE');
console.log('==========================================================\n');

import enhancePrompt from './routes/enhance-prompt.js';
import cinematicResponse from './routes/cinematic-response.js';
import planWebsiteComponents from './routes/plan-website-components.js';
import generateSingleComponent from './routes/generate-single-component.js';
import generateAiCodeStream from './routes/generate-ai-code-stream.js';
import applyAiCodeStream from './routes/apply-ai-code-stream.js';
import createAiSandboxV2 from './routes/create-ai-sandbox-v2.js';
import sandboxStatus from './routes/sandbox-status.js';
import getSandboxFiles from './routes/get-sandbox-files.js';
import installPackages from './routes/install-packages.js';
import analyzeEditIntent from './routes/analyze-edit-intent.js';
import createZip from './routes/create-zip.js';
import componentCatalog from './routes/component-catalog.js';
import selectComponents from './routes/select-components.js';
import componentBundle from './routes/component-bundle.js';
import buildTemplate from './routes/build-template.js';
import deriveDesignSystem from './routes/derive-design-system.js';
import buildFromSelection from './routes/build-from-selection.js';
import renderApp from './routes/render-app.js';
import validateImportsRoute from './routes/validate-imports.js';
import verifyBuildRoute from './routes/verify-build.js';
import finalizeCodebase from './routes/finalize-codebase.js';
import { optionalAuth } from './middleware/authMiddleware.js';
import initProject from './routes/init-project.js';
import updateProjectRoute from './routes/update-project.js';
import getProject from './routes/get-project.js';
import saveSnapshot from './routes/save-snapshot.js';
import getSnapshots from './routes/get-snapshots.js';
import publishSite from './routes/publish.js';
import taxonomyApi from './routes/taxonomy-api.js';
import resolveBlueprintRoute from './routes/resolve-blueprint.js';
import communityRoutes from './routes/community/index.js';
import trackRetention from './routes/track-retention.js';
import submitFeedback from './routes/feedback.js';
import billingRoutes from './routes/billing.js';
import webhookRoutes from './routes/webhooks.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Early Request Logger (before body parsing)
app.use((req, res, next) => {
  console.log(`[Server] INCOMING: ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'https://volturiano.com' }));

// ═══ CRITICAL: Stripe Webhook needs RAW body BEFORE express.json() ═══
// Stripe signature verification requires the raw request bytes.
// If express.json() parses it first, the signature check will fail.
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '50mb' }));

// Final JSON Logger
app.use((req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[Server] PARSED: ${req.method} ${req.url} | Payload: ${JSON.stringify(req.body).length} bytes`);
  }
  next();
});

// Initialize global sandbox state
global.sandboxState = { fileCache: { files: {}, lastSync: null, sandboxId: null }, sandbox: null, sandboxData: null };
global.activeSandboxProvider = null;
global.sandboxData = null;
global.existingFiles = new Set();

import sandboxKeepAlive from './routes/sandbox-keepalive.js';

// Routes
app.post('/api/enhance-prompt', enhancePrompt);
app.post('/api/cinematic-response', cinematicResponse);
app.post('/api/derive-design-system', deriveDesignSystem);
app.post('/api/plan-website-components', planWebsiteComponents);
app.post('/api/generate-single-component', generateSingleComponent);
app.post('/api/generate-ai-code-stream', generateAiCodeStream);
app.post('/api/apply-ai-code-stream', applyAiCodeStream);
app.post('/api/create-ai-sandbox-v2', createAiSandboxV2);
app.post('/api/sandbox/keepalive', optionalAuth, sandboxKeepAlive);
app.get('/api/sandbox-status', sandboxStatus);
app.get('/api/get-sandbox-files', getSandboxFiles);
app.post('/api/install-packages', installPackages);
app.post('/api/analyze-edit-intent', analyzeEditIntent);
app.post('/api/create-zip', createZip);

app.post('/api/feedback', optionalAuth, submitFeedback);

// Premium component registry routes
app.get('/api/component-catalog', componentCatalog);
app.post('/api/select-components', selectComponents);
app.get('/api/component-bundle', componentBundle);
app.post('/api/component-bundle', componentBundle);
app.post('/api/build-from-selection', buildFromSelection);
app.post('/api/build-template', buildTemplate);
app.get('/api/build-template', buildTemplate);
// Deterministic App.jsx renderer
app.post('/api/render-app', renderApp);

// Import Graph Validator (Prompt 7)
app.post('/api/validate-imports', validateImportsRoute);

// Verify Build (Prompt 8)
app.post('/api/verify-build', verifyBuildRoute);

// Finalize Codebase (Polish Step)
app.post('/api/finalize-codebase', finalizeCodebase);

// Project & Database Routes
app.post('/api/projects/init', optionalAuth, initProject);
app.post('/api/projects/update', optionalAuth, updateProjectRoute);
app.get('/api/projects/get', optionalAuth, getProject);
app.post('/api/snapshots', optionalAuth, saveSnapshot);
app.get('/api/snapshots', optionalAuth, getSnapshots);

// Publish Site (Phase 5) — optionalAuth attaches user if logged in
app.post('/api/publish-site', optionalAuth, publishSite);

// Phase S7: Taxonomy & Blueprint System
app.use('/api/taxonomy', taxonomyApi);
app.post('/api/resolve-blueprint', resolveBlueprintRoute);

// Phase S9: Community Routes (Component submissions, ratings, etc.)
app.use('/api/community', communityRoutes);

// Phase S9.14: Usage Feedback Loop (Retention Tracking)
app.post('/api/track-retention', optionalAuth, trackRetention);

// Phase S12: Credits & Billing (Stripe Integration)
app.use('/api/billing', billingRoutes);

// Phase S12: Stripe Webhook (Credit Fulfillment)
app.use('/api/webhooks', webhookRoutes);

// Phase S13: Dashboard & Project Management
app.use('/api/dashboard', dashboardRoutes);

// Phase S26: User Settings (preferred mode, etc.)
app.use('/api/settings', settingsRoutes);

// List published sites API (User specific or all depending on auth)
app.get('/api/published-sites', optionalAuth, async (req, res) => {
  try {
    const { supabaseAdmin } = await import('./lib/supabase-admin.js');
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: 'Database configuration missing' });
    }

    let query = supabaseAdmin
      .from('published_sites')
      .select('*')
      .order('published_at', { ascending: false });

    // Filter by user if logged in, otherwise show all active
    if (req.user?.id) {
      query = query.eq('user_id', req.user.id);
    } else {
      query = query.eq('status', 'active');
    }

    const { data: sites, error } = await query;
    if (error) throw error;

    res.json({ success: true, sites });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 1. Redirect /sites/slug to /sites/slug/ (ensures relative paths resolve correctly)
app.get('/sites/:slug', (req, res, next) => {
  if (!req.url.endsWith('/')) {
    return res.redirect(301, req.url + '/');
  }
  next();
});

// 2. Serve static assets for published sites (proxy to Supabase Storage)
// This handler handles both the root /sites/:slug/ and all sub-paths /sites/:slug/*
app.use('/sites/:slug', async (req, res, next) => {
  const slug = req.params.slug;
  // req.path is the remainder after /sites/:slug
  const filePath = (req.path === '/' || req.path === '') ? 'index.html' : req.path.replace(/^\//, '');

  if (!process.env.SUPABASE_URL) {
    return res.status(500).send('Storage configuration missing');
  }

  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, '');
  const storageUrl = `${supabaseUrl}/storage/v1/object/public/published-sites/${slug}/${filePath}`;

  console.log(`[Proxy] Request for site: ${slug}, file: ${filePath}`);

  try {
    const response = await fetch(storageUrl);
    console.log(`[Proxy] Storage response for ${slug}/${filePath}: ${response.status} ${response.statusText}`);

    // If object not found (404/400), try SPA fallback for the root index
    if (!response.ok) {
      if (response.status === 404 || response.status === 400) {
        // Only fallback to index.html for non-asset requests (to support SPA routing)
        if (!filePath.match(/\.(js|css|json|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|eot)$/)) {
          const indexUrl = `${supabaseUrl}/storage/v1/object/public/published-sites/${slug}/index.html`;
          const indexResponse = await fetch(indexUrl);
          
          if (!indexResponse.ok) {
            return res.status(404).send('Site content not found');
          }
          
          res.status(200);
          res.setHeader('Content-Type', 'text/html');
          res.removeHeader('Content-Security-Policy');
          res.removeHeader('X-Frame-Options');
          
          const buffer = await indexResponse.arrayBuffer();
          return res.send(Buffer.from(buffer));
        }
        return res.status(404).send('Asset not found');
      }
      return res.status(response.status).send(response.statusText);
    }

    // Set status
    res.status(response.status);
    
    // Copy headers securely
    const allowedHeaders = ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified'];
    response.headers.forEach((value, key) => {
      if (allowedHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // CRITICAL MIME TYPE ENFORCEMENT: Supabase Storage sometimes defaults to text/plain
    if (filePath.endsWith('.html') || !filePath.includes('.')) {
      res.setHeader('Content-Type', 'text/html');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }

    // Explicitly remove restrictive headers
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (err) {
    console.error('[Proxy Error] Fetching from Supabase Storage failed:', err);
    res.status(500).send('Proxy server error');
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server] Fatal Route Error:', err);

  const logPath = path.join(__dirname, 'server_fatal.log');
  const time = new Date().toISOString();
  const line = `[${time}] FATAL: ${err.message}\nSTACK: ${err.stack}\nURL: ${req.url}\nBODY: ${JSON.stringify(req.body)}\n\n`;

  // Fire and forget logging
  import('fs/promises').then(fs => {
    fs.appendFile(logPath, line).catch(() => { });
  }).catch(() => { });

  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// Global error handling to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error);
});

import { runWorker } from './workers/submission-analyzer.js';

app.listen(PORT, () => {
  console.log(`[Volturiano Builder Server] Running on port ${PORT}`);
  console.log(`[Volturiano Builder Server] E2B API Key: ${process.env.E2B_API_KEY ? 'Set' : 'MISSING'}`);
  console.log(`[Volturiano Builder Server] OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Set' : 'MISSING'}`);
  console.log(`[Volturiano Builder Server] Supabase URL: ${process.env.SUPABASE_URL ? 'Set' : 'MISSING'}`);
  console.log(`[Volturiano Builder Server] Supabase Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'MISSING'}`);

  // Start background worker to process Community submissions in same thread
  runWorker().catch(err => console.error('[Analyzer] Background Worker fatally crashed:', err));
});
