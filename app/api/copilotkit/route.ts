import { NextRequest } from 'next/server';
import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Gracefully map LiteLLM envs to OpenAI client expectations
if (!process.env.OPENAI_API_KEY && process.env.LITELLM_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.LITELLM_API_KEY;
}
// OpenAI client uses 'baseURL'; some libs also read OPENAI_BASE_URL
if (!process.env.OPENAI_BASE_URL && process.env.LITELLM_BASE_URL) {
  process.env.OPENAI_BASE_URL = process.env.LITELLM_BASE_URL;
}

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL || process.env.LITELLM_BASE_URL;
const model = process.env.LLM_MODEL || 'gpt-4o-mini';

const openai = new OpenAI({ apiKey, baseURL });

// Create the service adapter for CopilotKit runtime
// Tweaks for proxy compatibility (LiteLLM):
// - keepSystemRole: use 'system' role instead of mapping to 'developer' to avoid proxy role mismatches
// - disableParallelToolCalls: some proxies/providers dislike parallel tool calls
const serviceAdapter = new OpenAIAdapter({ openai, model, keepSystemRole: true, disableParallelToolCalls: true });

// Runtime instance (no params needed for basic setup)
const runtimeInstance = new CopilotRuntime();

// Build the Next.js App Router endpoint once and export its handlers.
const endpoint = copilotRuntimeNextJSAppRouterEndpoint({
  runtime: runtimeInstance,
  serviceAdapter,
  endpoint: '/api/copilotkit',
});

// Next expects named exports matching the HTTP verbs.
export const GET = endpoint.GET as unknown as (req: NextRequest) => Promise<Response>;
export const POST = endpoint.POST as unknown as (req: NextRequest) => Promise<Response>;
export const OPTIONS = endpoint.OPTIONS as unknown as (req: NextRequest) => Promise<Response>;
