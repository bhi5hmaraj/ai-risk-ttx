import { NextRequest, NextResponse } from 'next/server';
import { requireLLMEnv } from '@/server/lib/env';
import { LLM_HANDLERS, type LLMAction } from '@/lib/api/llm-handlers';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const envError = requireLLMEnv();
    if (envError) return envError;

    const { action } = await params;
    const handler = LLM_HANDLERS[action as LLMAction];

    if (!handler) {
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 404 }
      );
    }

    const body = await req.json();
    return await handler(body);
  } catch (error) {
    const { action } = await params;
    console.error(`[API /llm/generate/${action}] Error:`, error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
