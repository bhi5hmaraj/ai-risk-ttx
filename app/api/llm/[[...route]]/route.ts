/**
 * Catch-all route for /api/llm/*
 * Handles all LLM-related API endpoints using Hono
 *
 * In Next.js 15, we use [[...route]] for optional catch-all routing
 * This allows matching both /api/llm and /api/llm/*
 */
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { DEBUG_API, logDebug, logInfo, makeReqId, sanitizeHeaders, sanitizeEnv } from '@/server/lib/logger';
import llmRoutes from '@/server/routes/llm';

// Configure Node.js runtime (not Edge)
export const runtime = 'nodejs';

// Create Hono app
const app = new Hono().basePath('/api/llm');

// Runtime environment snapshot (once at cold start)
try {
  const envKeys = [
    'NODE_ENV',
    'VERCEL',
    'VITE_LITELLM_API_KEY',
    'VITE_LLM_MODEL',
    'DATABASE_URL',
  ];
  const envSnapshot = sanitizeEnv(envKeys);
  logInfo('[BOOT] /api/llm runtime', { node: process.version, debugApi: DEBUG_API, env: envSnapshot });
} catch {}

// Request logging + timing middleware
app.use('*', async (c, next) => {
  const id = makeReqId();
  const start = Date.now();
  const hdrs = c.req?.raw?.headers || c.req?.headers;
  
  logInfo(`[${id}] → ${c.req.method} ${c.req.path}`);
  logDebug(`[${id}] → ${c.req.method} ${c.req.path}`, {
    headers: sanitizeHeaders(hdrs),
  });
  
  try {
    c.set('reqId', id);
  } catch {}
  
  try {
    await next();
  } catch (err) {
    console.error(`[${id}] ✗ Unhandled error`, err);
    throw err;
  } finally {
    const ms = Date.now() - start;
    try {
      c.header('X-Req-Id', id);
    } catch {}
    logInfo(`[${id}] ← ${c.req.method} ${c.req.path} ${c.res.status} (${ms}ms)`);
  }
});

// Health check endpoints
app.get('/health', (c) => c.json({ ok: true }));
app.on('HEAD', '/health', (c) => c.body(null, 200));

// Mount all LLM routes
app.route('/', llmRoutes);

// Error handler
app.onError((err, c) => {
  console.error('[API ERROR]', err);
  const body: any = { success: false, error: 'Internal Server Error' };
  if (DEBUG_API) body.details = err?.message || String(err);
  return c.json(body, 500);
});

// 404 handler
app.notFound((c) => {
  logDebug('Route not found:', c.req.method, c.req.path);
  return c.json({ success: false, error: 'Not Found' }, 404);
});

// Export handlers for Next.js
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const HEAD = handle(app);
export const OPTIONS = handle(app);
