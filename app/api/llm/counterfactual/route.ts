import { NextRequest, NextResponse } from 'next/server';
import { generateCounterfactualConsequences } from '@/server/services/llmService';
import type { GenerateCounterfactualRequest } from '@/server/types/llm/requests';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const started = Date.now();
    const body = await req.json() as GenerateCounterfactualRequest;

    const round = body?.gameState?.round || 'n/a';
    console.log(`[/counterfactual]: round=${round}`);

    if (!body.gameState) {
      return NextResponse.json(
        { success: false, error: 'Missing: gameState' },
        { status: 400 }
      );
    }

    const result = await generateCounterfactualConsequences(
      body.gameState
    );

    console.log(`[/counterfactual]: result=${result ? `scoreChange=${result.publicScoreUpdate}` : 'NULL'} in ${Date.now() - started}ms`);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate counterfactual consequences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/counterfactual] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
