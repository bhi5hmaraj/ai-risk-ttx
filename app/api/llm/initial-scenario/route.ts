import { NextResponse } from 'next/server';
import { generateInitialScenario } from '@/server/services/llmService';
import { requireLLMEnv } from '@/server/lib/env';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const envError = requireLLMEnv();
    if (envError) return envError;
    console.log('[API /llm/initial-scenario] Request received');
    const result = await generateInitialScenario();
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate initial scenario' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/initial-scenario] Exception:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
