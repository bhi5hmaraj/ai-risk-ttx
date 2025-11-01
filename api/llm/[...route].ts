/**
 * Catch-all route for /api/llm/*
 * Handles all LLM-related API endpoints using Hono
 */
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { DEBUG_API, logDebug, logInfo, makeReqId, sanitizeHeaders, sanitizeEnv } from '../../server/lib/logger.js';
import llmRoutes from '../../server/routes/llm.js';

// Ensure Node runtime (avoid Edge/other ambiguity)
export const config = { runtime: 'nodejs' };

// Create Hono app (no basePath since Vercel handles /api/llm prefix)
const app = new Hono();

// Runtime environment snapshot (once at cold start)
try {
  const envKeys = [
    'NODE_ENV',
    'VERCEL',
    'LITELLM_BASE_URL',
    'LITELLM_API_KEY',
    'LLM_MODEL',
    'LLM_TIMEOUT_MS',
    'DATABASE_URL',
  ];
  const envSnapshot = sanitizeEnv(envKeys);
  logInfo('[BOOT] /api/llm runtime', { node: process.version, debugApi: DEBUG_API, env: envSnapshot });
} catch {}

// Request logging + timing (no body read to avoid consumption)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use('*', async (c: any, next: any) => {
  const id = makeReqId();
  const start = Date.now();
  const hdrs = (c.req?.raw?.headers as Headers) || (c.req as any)?.headers || undefined;
  // Always log a minimal line, even if DEBUG_API is off, so vercel dev shows activity
  logInfo(`[${id}] → ${c.req.method} ${c.req.path}`);
  logDebug(`[${id}] → ${c.req.method} ${c.req.path}`, {
    headers: sanitizeHeaders(hdrs),
  });
  try { c.set('reqId', id); } catch {}
  try {
    await next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[${id}] ✗ Unhandled error`, err);
    throw err;
  } finally {
    const ms = Date.now() - start;
    try { c.header('X-Req-Id', id); } catch {}
    logInfo(`[${id}] ← ${c.req.method} ${c.req.path} ${c.res.status} (${ms}ms)`);
    // Avoid iterating response headers in dev to prevent any adapter quirks
    // logDebug(`[${id}] res-headers`, Object.fromEntries((c.res?.headers as any) ?? []));
  }
});

// Health endpoints (handled here to rule out router issues)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.get('/api/llm/health', (c: any) => c.json({ ok: true }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.on('HEAD', '/api/llm/health', (c: any) => c.body(null, 200));
// Some dev adapters forward as '/llm/*' (no '/api' prefix)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.get('/llm/health', (c: any) => c.json({ ok: true }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.on('HEAD', '/llm/health', (c: any) => c.body(null, 200));
// Also expose without prefix in case adapter strips it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.get('/health', (c: any) => c.json({ ok: true }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.on('HEAD', '/health', (c: any) => c.body(null, 200));

// Mount routes for both styles to avoid path-prefix mismatches under different adapters
app.route('/api/llm', llmRoutes);
app.route('/llm', llmRoutes);
app.route('/', llmRoutes);

// Error and 404 handlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.onError((err: any, c: any) => {
  // eslint-disable-next-line no-console
  console.error('[API ERROR]', err);
  const body: any = { success: false, error: 'Internal Server Error' };
  if (DEBUG_API) body.details = err?.message || String(err);
  return c.json(body, 500);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.notFound((c: any) => {
  logDebug('Route not found:', c.req.method, c.req.path);
  return c.json({ success: false, error: 'Not Found' }, 404);
});

// Export Node adapter handler for Vercel & portability
export default handle(app);
