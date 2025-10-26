/**
 * Catch-all route for /api/llm/*
 * Handles all LLM-related API endpoints using Hono
 */
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import llmRoutes from '../routes/llm';

// Create Hono app (no basePath since Vercel handles /api/llm prefix)
const app = new Hono();

// Mount all LLM routes at root level
app.route('/', llmRoutes);

// Export handlers for Vercel
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

export default handle(app);
