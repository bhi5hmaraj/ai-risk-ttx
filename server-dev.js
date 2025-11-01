#!/usr/bin/env node
/**
 * Standalone development server for API routes
 * Alternative to `vercel dev` when it has port detection issues
 */

import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.API_PORT || 3000;

// Dynamically import the API routes
async function startServer() {
  try {
    // Import the LLM API routes
    const llmModule = await import('./api/llm/[...route].ts');
    const llmHandler = llmModule.default;

    // Import feedback route
    const feedbackModule = await import('./api/feedback.ts');
    const feedbackHandler = feedbackModule.default;

    // Import scenarios route
    const scenariosModule = await import('./api/scenarios.ts');
    const scenariosHandler = scenariosModule.default;

    const server = createServer(async (req, res) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

      try {
        // Route to appropriate handler
        if (req.url.startsWith('/api/llm')) {
          // Convert Node request to Fetch API Request
          const fetchReq = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? await getBody(req) : undefined,
          });

          const fetchRes = await llmHandler.fetch(fetchReq, {});

          // Convert Fetch Response to Node response
          res.statusCode = fetchRes.status;
          for (const [key, value] of fetchRes.headers) {
            res.setHeader(key, value);
          }
          const body = await fetchRes.text();
          res.end(body);

        } else if (req.url.startsWith('/api/feedback')) {
          await feedbackHandler(toVercelRequest(req), toVercelResponse(res));

        } else if (req.url.startsWith('/api/scenarios')) {
          await scenariosHandler(toVercelRequest(req), toVercelResponse(res));

        } else {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Not Found' }));
        }
      } catch (error) {
        console.error('Handler error:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
      }
    });

    server.listen(PORT, () => {
      console.log(`\n✅ API Server running on http://localhost:${PORT}`);
      console.log(`   Test: curl http://localhost:${PORT}/api/llm/health\n`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Helper to read request body
function getBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// Convert Node request to Vercel request format
function toVercelRequest(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: Object.fromEntries(url.searchParams),
    body: null, // Will be parsed by handler
  };
}

// Convert to Vercel response format
function toVercelResponse(res) {
  return {
    status: (code) => {
      res.statusCode = code;
      return this;
    },
    json: (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    },
    send: (data) => {
      res.end(data);
    },
  };
}

startServer();
