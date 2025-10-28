import { createServer } from 'http';
import { Hono } from 'hono';
import llmRoutes from '../api/routes/llm';

// Minimal local server for LLM API without Vercel CLI
const app = new Hono();

// Canonical path only: /api/llm
app.route('/api/llm', llmRoutes);

const port = Number(process.env.PORT || 3003);

const server = createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${port}`;
    const url = new URL(req.url || '/', `http://${host}`);

    // Collect body
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve) => {
      req.on('data', (c) => chunks.push(Buffer.from(c)));
      req.on('end', () => resolve());
      req.on('error', () => resolve());
    });
    const body = Buffer.concat(chunks);

    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers as any,
      body: body.length ? body : undefined,
    });

    const response = await app.fetch(request, { env: process.env });
    // Write response
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const respBody = Buffer.from(await response.arrayBuffer());
    res.end(respBody);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Server error', message: (err as Error)?.message }));
  }
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[dev-llm] Listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log('[dev-llm] DEBUG_API =', process.env.DEBUG_API);
});
