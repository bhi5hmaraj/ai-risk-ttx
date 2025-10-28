/**
 * Catch-all route for /api/llm/*
 * Handles all LLM-related API endpoints using Hono
 */
import { Hono } from 'hono';
import { DEBUG_API, logDebug, makeReqId, sanitizeHeaders } from '../lib/logger';
import llmRoutes from '../routes/llm';

// Create Hono app (no basePath since Vercel handles /api/llm prefix)
const app = new Hono();

// Runtime environment snapshot (once at cold start)
try {
  const envSnapshot = {
    node: process.version,
    vercel: process.env.VERCEL || 'false',
    nodeEnv: process.env.NODE_ENV || 'unknown',
    llmBase: process.env.LITELLM_BASE_URL ? String(process.env.LITELLM_BASE_URL) : 'unset',
    llmModel: process.env.LLM_MODEL || 'unset',
    llmKeyPresent: !!process.env.LITELLM_API_KEY,
    debugApi: DEBUG_API,
  };
  // eslint-disable-next-line no-console
  console.log('[API BOOT] /api/llm runtime:', envSnapshot);
} catch {}

// Request logging + timing (no body read to avoid consumption)
app.use('*', async (c, next) => {
  const id = makeReqId();
  const start = Date.now();
  const hdrs = (c.req?.raw?.headers as Headers) || (c.req as any)?.headers || undefined;
  logDebug(`[${id}] → ${c.req.method} ${c.req.path}`, {
    headers: sanitizeHeaders(hdrs),
  });
  try {
    await next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[${id}] ✗ Unhandled error`, err);
    throw err;
  } finally {
    const ms = Date.now() - start;
    logDebug(`[${id}] ← ${c.req.method} ${c.req.path} ${c.res.status} (${ms}ms)`);
  }
});

// Canonical mount for Edge: requests arrive with full path '/api/llm/*'
app.route('/api/llm', llmRoutes);
// Compatibility alias for frontend calls missing '/api'
app.route('/llm', llmRoutes);

// Run this function on Vercel Edge to ensure Web Fetch Request semantics
export const config = { runtime: 'edge' };

// Export default fetch handler (Edge-compatible)
export default app.fetch;

// Error and 404 handlers
app.onError((err, c) => {
  // eslint-disable-next-line no-console
  console.error('[API ERROR]', err);
  const body: any = { success: false, error: 'Internal Server Error' };
  if (DEBUG_API) body.details = err?.message || String(err);
  return c.json(body, 500);
});

app.notFound((c) => {
  logDebug('Route not found:', c.req.method, c.req.path);
  return c.json({ success: false, error: 'Not Found' }, 404);
});
