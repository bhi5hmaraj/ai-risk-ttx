import { NextRequest, NextResponse } from 'next/server';
import { generateCustomScenario } from '@/server/services/llmService';
import type { GenerateCustomScenarioRequest } from '@/server/types/llm/requests';
import { requireLLMEnv } from '@/server/lib/env';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const envError = requireLLMEnv();
    if (envError) return envError;
    const started = Date.now();
    const body = await req.json() as GenerateCustomScenarioRequest;

    const descLength = body?.scenarioDescription?.length || 0;
    console.log(`[/custom-scenario]: descriptionLength=${descLength}`);

    if (!body.scenarioDescription || body.scenarioDescription.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or empty: scenarioDescription' },
        { status: 400 }
      );
    }

    const result = await generateCustomScenario(
      body.scenarioDescription
    );

    console.log(`[/custom-scenario]: result=${result ? `title="${result.scenarioTitle}"` : 'NULL'} in ${Date.now() - started}ms`);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate custom scenario' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/custom-scenario] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
