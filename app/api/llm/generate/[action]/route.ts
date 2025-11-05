import { NextRequest, NextResponse } from 'next/server';
import { requireLLMEnv } from '@/server/lib/env';
import { LLM_HANDLERS, type LLMAction } from '@/server/api/llm-handlers';
import { createReqId, getReqIdFromHeaders, slog } from '@/server/lib/logger';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const envError = requireLLMEnv();
    if (envError) return envError;

    const { action } = await params;
    const rid = getReqIdFromHeaders(req.headers) || createReqId('llm');
    const handler = LLM_HANDLERS[action as LLMAction];

    if (!handler) {
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 404 }
      );
    }

    const body = await req.json();
    const t0 = Date.now();
    const res = await handler(body);
    try { res.headers?.set?.('x-req-id', rid); } catch {}
    slog(rid, `/api/llm/generate/${action} done`, { status: res.status, dt: Date.now() - t0 });
    return res;
  } catch (error) {
    const { action } = await params;
    const rid = createReqId('llm');
    slog(rid, `/api/llm/generate/${action} error`, { err: (error as any)?.message || String(error) });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
