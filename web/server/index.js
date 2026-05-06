import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { logger } from './lib/logger.js';

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
import hydratePremiumCopy from './routes/hydrate-premium-copy.js';
import classifyIntent from './routes/classify-intent.js';
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
import lovableReplayStatus from './routes/lovable-replay-status.js';
import { optionalAuth, requireAuth, requireUnrestricted } from './middleware/authMiddleware.js';
import { logLaunchReadinessChecks } from './lib/launch-readiness.js';
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
import submitIssue from './routes/issues.js';
import billingRoutes from './routes/billing.js';
import webhookRoutes from './routes/webhooks.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';
import adminRoutes from './routes/admin.js';
import agentRoutes from './routes/agent.js';

const app = express();
app.disable('x-powered-by');

// Trust Railway's reverse proxy for correct IP identification
// Fixes "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR" in express-rate-limit
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const configuredCorsOrigin = process.env.CORS_ORIGIN;

if (isProduction && !configuredCorsOrigin) {
  throw new Error('CORS_ORIGIN is required in production.');
}

const corsOrigin = (configuredCorsOrigin || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Security headers for API/backend responses. Published sites keep their own frame policy.
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.id = Array.isArray(requestId) ? requestId[0] : String(requestId);
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Early Request Logger (before body parsing)
app.use((req, res, next) => {
  logger.info('Server', `INCOMING: ${req.method} ${req.url}`, { requestId: req.id });
  next();
});

// Middleware
app.use(cors({ 
  origin: corsOrigin.length === 1 ? corsOrigin[0] : corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true 
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (!req.path.startsWith('/sites/')) {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  }
  next();
});

// ═══ CRITICAL: Stripe Webhook needs RAW body BEFORE express.json() ═══
// Stripe signature verification requires the raw request bytes.
// If express.json() parses it first, the signature check will fail.
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

const heavyJsonRoutes = [
  '/api/generate-ai-code-stream',
  '/api/apply-ai-code-stream',
  '/api/create-ai-sandbox-v2',
  '/api/render-app',
  '/api/finalize-codebase',
  '/api/publish-site',
  '/api/community/submit-component',
  '/api/community/submit-template',
  '/api/admin/upload-asset'
];

app.use(heavyJsonRoutes, express.json({ limit: process.env.LARGE_JSON_BODY_LIMIT || '60mb' }));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '8mb' }));

// Final JSON Logger
app.use((req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    if (process.env.NODE_ENV === 'development') {
      logger.info('Server', `PARSED: ${req.method} ${req.url}`, req.body);
    } else {
      logger.info('Server', `PARSED: ${req.method} ${req.url} | Payload: ${JSON.stringify(req.body).length} bytes`);
    }
  }
  next();
});

// Initialize global sandbox state
global.sandboxState = { fileCache: { files: {}, lastSync: null, sandboxId: null }, sandbox: null, sandboxData: null };
global.activeSandboxProvider = null;
global.sandboxData = null;
global.existingFiles = new Set();

import sandboxKeepAlive from './routes/sandbox-keepalive.js';

// Initialize Rate Limiters
const strictLimiter = rateLimit({ windowMs: 60000, max: 10, message: { error: 'Too many requests' } });
const aiLimiter = rateLimit({ windowMs: 60000, max: 50, message: { error: 'AI generation rate limited' } });
const standardLimiter = rateLimit({ windowMs: 60000, max: 30, message: { error: 'Rate limit exceeded' } });
const relaxedLimiter = rateLimit({ windowMs: 60000, max: 60, message: { error: 'Rate limit exceeded' } });
const publishLimiter = rateLimit({ windowMs: 5 * 60000, max: 8, message: { error: 'Publishing rate limited' } });
const communitySubmitLimiter = rateLimit({ windowMs: 60 * 60000, max: 20, message: { error: 'Community submission rate limited' } });
const publicNoticeLimiter = rateLimit({ windowMs: 60 * 60000, max: 12, message: { error: 'Notice intake rate limited' } });
const feedbackLimiter = rateLimit({ windowMs: 60 * 60000, max: 30, message: { error: 'Feedback submission rate limited' } });

// Apply AI Limiters
app.use(['/api/enhance-prompt', '/api/classify-intent', '/api/derive-design-system', '/api/plan-website-components', '/api/generate-single-component', '/api/generate-ai-code-stream', '/api/apply-ai-code-stream', '/api/hydrate-premium-copy', '/api/create-ai-sandbox-v2'], aiLimiter);

// Apply Standard Limiters
app.use(['/api/projects', '/api/snapshots', '/api/publish-site'], standardLimiter);
app.use('/api/publish-site', publishLimiter);
app.use(['/api/community/submit-component', '/api/community/submit-template'], communitySubmitLimiter);
app.use('/api/community/takedown', publicNoticeLimiter);
app.use('/api/billing/refund-request', strictLimiter);

// Global Prompt Bloat & Denial of Wallet Protection
const promptTruncationMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    if (typeof req.body.prompt === 'string') {
      req.body.prompt = req.body.prompt.substring(0, 4000); // Max 4000 chars for prompts
    }
    if (typeof req.body.overallContext === 'string') {
      req.body.overallContext = req.body.overallContext.substring(0, 4000);
    }
    if (typeof req.body.siteTitle === 'string') {
      req.body.siteTitle = req.body.siteTitle.substring(0, 150);
    }
  }
  next();
};

const aiProtections = [aiLimiter, requireAuth, requireUnrestricted, promptTruncationMiddleware];
const safeAiProtections = [aiLimiter, optionalAuth, requireUnrestricted, promptTruncationMiddleware];

// Routes
app.post('/api/enhance-prompt', aiProtections, enhancePrompt);
app.post('/api/cinematic-response', safeAiProtections, cinematicResponse);
app.post('/api/classify-intent', aiProtections, classifyIntent);
app.post('/api/derive-design-system', aiProtections, deriveDesignSystem);
app.post('/api/plan-website-components', aiProtections, planWebsiteComponents);
app.post('/api/generate-single-component', aiProtections, generateSingleComponent);
app.post('/api/generate-ai-code-stream', aiProtections, generateAiCodeStream);
app.post('/api/apply-ai-code-stream', aiProtections, applyAiCodeStream);
app.post('/api/hydrate-premium-copy', aiProtections, hydratePremiumCopy);
app.post('/api/create-ai-sandbox-v2', aiProtections, createAiSandboxV2);
app.post('/api/sandbox/keepalive', requireAuth, sandboxKeepAlive);
app.get('/api/sandbox-status', sandboxStatus);
app.get('/api/get-sandbox-files', getSandboxFiles);
app.post('/api/install-packages', aiProtections, installPackages);
app.post('/api/analyze-edit-intent', aiProtections, analyzeEditIntent);
app.post('/api/create-zip', aiProtections, createZip);

app.post('/api/feedback', feedbackLimiter, optionalAuth, submitFeedback);
app.post('/api/issues', feedbackLimiter, optionalAuth, submitIssue);

// Premium component registry routes
app.get('/api/component-catalog', relaxedLimiter, componentCatalog);
app.post('/api/select-components', standardLimiter, selectComponents);
app.get('/api/component-bundle', relaxedLimiter, componentBundle);
app.post('/api/component-bundle', relaxedLimiter, componentBundle);
app.post('/api/build-from-selection', aiProtections, buildFromSelection);
app.post('/api/build-template', aiProtections, buildTemplate);
app.get('/api/build-template', relaxedLimiter, optionalAuth, buildTemplate);
// Deterministic App.jsx renderer
app.post('/api/render-app', aiProtections, renderApp);

// Import Graph Validator (Prompt 7)
app.post('/api/validate-imports', aiProtections, validateImportsRoute);

// Verify Build (Prompt 8)
app.post('/api/verify-build', standardLimiter, optionalAuth, verifyBuildRoute);
app.get('/api/lovable-replay-status', standardLimiter, optionalAuth, lovableReplayStatus);

// Finalize Codebase (Polish Step)
app.post('/api/finalize-codebase', aiProtections, finalizeCodebase);

// Project & Database Routes
app.post('/api/projects/init', requireAuth, requireUnrestricted, initProject);
app.post('/api/projects/update', requireAuth, requireUnrestricted, updateProjectRoute);
app.get('/api/projects/get', requireAuth, getProject);
app.post('/api/snapshots', requireAuth, requireUnrestricted, saveSnapshot);
app.get('/api/snapshots', requireAuth, getSnapshots);

// Publish Site (Phase 5)
app.post('/api/publish-site', requireAuth, requireUnrestricted, publishSite);

// Phase S7: Taxonomy & Blueprint System
app.use('/api/taxonomy', relaxedLimiter, taxonomyApi);
app.post('/api/resolve-blueprint', standardLimiter, resolveBlueprintRoute);

// Phase S9: Community Routes (Component submissions, ratings, etc.)
app.use('/api/community', relaxedLimiter, communityRoutes);

// Phase S9.14: Usage Feedback Loop (Retention Tracking)
app.post('/api/track-retention', standardLimiter, optionalAuth, trackRetention);

// Phase S12: Credits & Billing (Stripe Integration)
app.use('/api/billing', strictLimiter, billingRoutes);

// Phase S12: Stripe Webhook (Credit Fulfillment)
app.use('/api/webhooks', webhookRoutes);

// Phase S13: Dashboard & Project Management
app.use('/api/dashboard', dashboardRoutes);

// Phase S26: User Settings (preferred mode, etc.)
app.use('/api/settings', settingsRoutes);

// Admin Panel: Component metadata management
app.use('/api/admin', strictLimiter, adminRoutes);

// Phase A1: Agentic Builder (AI agent loop with tool calling)
// requireUnrestricted blocks AI calls when the user has restricted processing in Settings.
app.use('/api/agent', aiLimiter, optionalAuth, requireUnrestricted, agentRoutes);

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

// Cache published_sites.status lookups briefly so each asset request doesn't hit the DB.
const sitesStatusCache = new Map(); // slug -> { status, expiresAt }
const SITES_STATUS_TTL_MS = 60 * 1000; // 60s
async function getPublishedSiteStatus(slug) {
  if (!slug) return null;
  const cached = sitesStatusCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.status;
  }
  if (!global.__supabaseAdminCached) {
    try {
      const mod = await import('./lib/supabase-admin.js');
      global.__supabaseAdminCached = mod.supabaseAdmin || null;
    } catch {
      global.__supabaseAdminCached = null;
    }
  }
  const client = global.__supabaseAdminCached;
  if (!client) return 'active'; // Fail-open if DB is down so we don't break live sites.
  try {
    const { data } = await client
      .from('published_sites')
      .select('status')
      .eq('slug', slug)
      .maybeSingle();
    const status = data?.status || null;
    sitesStatusCache.set(slug, { status, expiresAt: Date.now() + SITES_STATUS_TTL_MS });
    return status;
  } catch {
    return 'active'; // Fail-open on unexpected errors to preserve availability.
  }
}

// 2. Serve static assets for published sites (proxy to Supabase Storage)
// This handler handles both the root /sites/:slug/ and all sub-paths /sites/:slug/*
app.use('/sites/:slug', async (req, res, next) => {
  const slug = req.params.slug;
  // req.path is the remainder after /sites/:slug
  const filePath = (req.path === '/' || req.path === '') ? 'index.html' : req.path.replace(/^\//, '');

  if (!process.env.SUPABASE_URL) {
    return res.status(500).send('Storage configuration missing');
  }

  // Refuse to serve sites that are paused, deleted, or not registered.
  // The DB row is the source of truth for "is this site live?". Without
  // this check, a `paused` slug whose storage objects still exist would
  // continue to be reachable via direct URL.
  const siteStatus = await getPublishedSiteStatus(slug);
  if (siteStatus === 'paused') {
    return res.status(410).send('This site is currently unavailable.');
  }
  if (siteStatus === 'deleted' || siteStatus === null) {
    return res.status(404).send('Site not found');
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

  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

// Global error handling to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error);
});

import { runWorker } from './workers/submission-analyzer.js';

const server = app.listen(PORT, () => {
  console.log(`[Volturiano Builder Server] Running on port ${PORT}`);
  console.log(`[Volturiano Builder Server] E2B API Key: ${process.env.E2B_API_KEY ? 'Set' : 'MISSING'}`);
  console.log(`[Volturiano Builder Server] OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Set' : 'MISSING'}`);
  console.log(`[Volturiano Builder Server] Supabase URL: ${process.env.SUPABASE_URL ? 'Set' : 'MISSING'}`);
  console.log(`[Volturiano Builder Server] Supabase Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'MISSING'}`);

  // Start background worker to process Community submissions in same thread
  logLaunchReadinessChecks().catch(err => logger.error('LaunchReadiness', 'Readiness checks crashed unexpectedly', {
    error: err?.message || String(err)
  }));
  runWorker().catch(err => console.error('[Analyzer] Background Worker fatally crashed:', err));
});

// ═══ CRITICAL: Prevent Railway 502 on long-running LLM requests ═══
// Gemini 3.1 Pro structured output can take 60-120s for complex plans.
// Node.js defaults to 120s, but Railway's proxy can cut sooner.
// Setting 5 minutes gives ample headroom.
server.timeout = 300000;           // 5 min — max time for a request to complete
server.keepAliveTimeout = 120000;  // 2 min — keep TCP connections alive between requests
server.headersTimeout = 305000;    // 5 min + 5s — must be > timeout per Node.js docs
