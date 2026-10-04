import './lib/load-env.js';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { logger } from './lib/logger.js';
import { attachLocalUser } from './middleware/local-user.js';
import { DATA_DIR, FILES_DIR, db } from './lib/store/index.js';
import { describeProviderSetup } from './lib/provider-helpers.js';

import agentRoutes from './routes/agent.js';
import applyAiCodeStream from './routes/apply-ai-code-stream.js';
import buildTemplate from './routes/build-template.js';
import cinematicResponse from './routes/cinematic-response.js';
import componentCatalog from './routes/component-catalog.js';
import createAiSandboxV2 from './routes/create-ai-sandbox-v2.js';
import createZip from './routes/create-zip.js';
import {
  prepareDesignIntakeRoute,
  refreshDesignIntakeComponentsRoute,
  finalizeDesignIntakeRoute,
} from './routes/design-intake.js';
import getSandboxFiles from './routes/get-sandbox-files.js';
import githubIntegrationRoutes from './routes/integrations/github.js';
import projectRoutes from './routes/projects.js';
import sandboxKeepAlive from './routes/sandbox-keepalive.js';
import sandboxStatus from './routes/sandbox-status.js';
import saveSnapshot from './routes/save-snapshot.js';
import getSnapshots from './routes/get-snapshots.js';
import validateImportsRoute from './routes/validate-imports.js';
import verifyBuildRoute from './routes/verify-build.js';

const app = express();
app.disable('x-powered-by');

const PORT = process.env.PORT || 3001;
const corsOrigin = (process.env.CORS_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.id = Array.isArray(requestId) ? requestId[0] : String(requestId);
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.use(cors({
  origin: corsOrigin.length === 1 ? corsOrigin[0] : corsOrigin,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Routes that carry generated code or reference images need a larger body limit.
const heavyJsonRoutes = [
  '/api/agent',
  '/api/apply-ai-code-stream',
  '/api/create-ai-sandbox-v2',
  '/api/design-intake',
  '/api/snapshots',
];
app.use(heavyJsonRoutes, express.json({ limit: process.env.LARGE_JSON_BODY_LIMIT || '60mb' }));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '8mb' }));

app.use((req, res, next) => {
  logger.info('Server', `${req.method} ${req.url}`, { requestId: req.id });
  next();
});

// Shared sandbox state used by the sandbox manager and the apply stream.
global.sandboxState = { fileCache: { files: {}, lastSync: null, sandboxId: null }, sandbox: null, sandboxData: null };
global.activeSandboxProvider = null;
global.sandboxData = null;
global.existingFiles = new Set();

// Rate limiting is one knob: requests per minute to the routes that call a model
// or a sandbox. Set RATE_LIMIT_PER_MINUTE=0 to turn it off.
const rateLimitPerMinute = Number.parseInt(process.env.RATE_LIMIT_PER_MINUTE ?? '60', 10);
const aiLimiter = rateLimitPerMinute > 0
  ? rateLimit({ windowMs: 60000, max: rateLimitPerMinute, message: { error: 'Rate limit exceeded. Try again in a minute.' } })
  : (req, res, next) => next();

// Prompts are capped so a single request cannot run up an unbounded model bill.
const truncatePrompt = (req, res, next) => {
  if (req.body && typeof req.body === 'object' && typeof req.body.prompt === 'string') {
    req.body.prompt = req.body.prompt.substring(0, 4000);
  }
  next();
};
const ai = [aiLimiter, truncatePrompt];

// There is no login. Every request belongs to the single local user.
app.use('/api', attachLocalUser);

// Agent: first build, chat edits, undo, session history
app.use('/api/agent', aiLimiter, agentRoutes);

// Guided design intake shown before the first build
app.post('/api/design-intake/prepare', ai, prepareDesignIntakeRoute);
app.post('/api/design-intake/components', ai, refreshDesignIntakeComponentsRoute);
app.post('/api/design-intake/finalize', finalizeDesignIntakeRoute);
app.post('/api/cinematic-response', ai, cinematicResponse);

// Sandbox lifecycle and files
app.post('/api/create-ai-sandbox-v2', ai, createAiSandboxV2);
app.post('/api/sandbox/keepalive', sandboxKeepAlive);
app.get('/api/sandbox-status', sandboxStatus);
app.get('/api/get-sandbox-files', getSandboxFiles);
app.post('/api/apply-ai-code-stream', ai, applyAiCodeStream);
app.post('/api/validate-imports', validateImportsRoute);
app.post('/api/verify-build', aiLimiter, verifyBuildRoute);

// Component registry
app.get('/api/component-catalog', componentCatalog);
app.get('/api/build-template', buildTemplate);
app.post('/api/build-template', ai, buildTemplate);

// Projects, snapshots, export, publish
app.use('/api/projects', projectRoutes);
app.post('/api/snapshots', saveSnapshot);
app.get('/api/snapshots', getSnapshots);
app.post('/api/create-zip', createZip);
app.use('/api/integrations/github', githubIntegrationRoutes);

// Files written by the server (project thumbnails, reference images)
app.use('/api/files', express.static(FILES_DIR, { fallthrough: false, index: false }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Uploaded images are too large. Try fewer images or a smaller screenshot, then retry.',
    });
  }
  if (err?.status === 404) return res.status(404).json({ success: false, error: 'Not found' });

  logger.error('Server', `Unhandled error on ${req.method} ${req.url}`, { error: err?.message, requestId: req.id });
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught exception:', error);
});

const server = app.listen(PORT, () => {
  console.log(`[volturiano-agent] API listening on http://127.0.0.1:${PORT}`);
  console.log(`[volturiano-agent] Data directory: ${DATA_DIR}`);
  for (const line of describeProviderSetup()) console.log(`[volturiano-agent] ${line}`);
});

// The store batches writes for a moment; make sure they land before exiting.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    db.flush();
    process.exit(0);
  });
}

// A model call inside one agent turn can run for minutes.
server.timeout = 300000;
server.keepAliveTimeout = 120000;
server.headersTimeout = 305000;
