import { NextRequest } from 'next/server';
import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime';
import OpenAI from 'openai';
import { loadSecrets } from '@/lib/infisical';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cachedEndpoint:
  | ReturnType<typeof copilotRuntimeNextJSAppRouterEndpoint>
  | null = null;
let cachedSig: string | null = null;

async function getEndpoint() {
  // Ensure Infisical secrets are loaded before we read model/baseURL.
  await loadSecrets();

  // Gracefully map LiteLLM envs to OpenAI client expectations
  if (!process.env.OPENAI_API_KEY && process.env.LITELLM_API_KEY) {
    process.env.OPENAI_API_KEY = process.env.LITELLM_API_KEY;
  }
  // OpenAI client uses 'baseURL'; some libs also read OPENAI_BASE_URL
  if (!process.env.OPENAI_BASE_URL && process.env.LITELLM_BASE_URL) {
    process.env.OPENAI_BASE_URL = process.env.LITELLM_BASE_URL;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseURL = process.env.OPENAI_BASE_URL || process.env.LITELLM_BASE_URL;
  const model = process.env.LLM_MODEL || process.env.NEXT_PUBLIC_LLM_MODEL || 'gpt-4o-mini';

  const sig = `${baseURL || ''}|${model}|${apiKey.slice(-4)}`;
  if (cachedEndpoint && cachedSig === sig) return cachedEndpoint;

  const openai = new OpenAI({ apiKey, baseURL });

  // Create the service adapter for CopilotKit runtime
  // Tweaks for proxy compatibility (LiteLLM):
  // - keepSystemRole: use 'system' role instead of mapping to 'developer' to avoid proxy role mismatches
  // - disableParallelToolCalls: some proxies/providers dislike parallel tool calls
  const serviceAdapter = new OpenAIAdapter({ openai, model, keepSystemRole: true, disableParallelToolCalls: true });

  // Runtime instance (no params needed for basic setup)
  const runtimeInstance = new CopilotRuntime();

  cachedEndpoint = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: runtimeInstance,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });
  cachedSig = sig;

  return cachedEndpoint;
}

function missingKeyResponse() {
  return new Response('Missing OPENAI_API_KEY (or LITELLM_API_KEY)', { status: 500 });
}

// Next expects named exports matching the HTTP verbs.
export async function GET(req: NextRequest): Promise<Response> {
  const endpoint = await getEndpoint();
  if (!endpoint) return missingKeyResponse();
  return endpoint.GET(req) as unknown as Promise<Response>;
}

export async function POST(req: NextRequest): Promise<Response> {
  const endpoint = await getEndpoint();
  if (!endpoint) return missingKeyResponse();
  return endpoint.POST(req) as unknown as Promise<Response>;
}

export async function OPTIONS(req: NextRequest): Promise<Response> {
  const endpoint = await getEndpoint();
  if (!endpoint) return missingKeyResponse();
  return endpoint.OPTIONS(req) as unknown as Promise<Response>;
}
