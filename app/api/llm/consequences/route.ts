import { NextRequest, NextResponse } from 'next/server';
import { generateConsequences } from '@/server/services/llmService';
import type { GenerateConsequencesRequest } from '@/server/types/llm/requests';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const started = Date.now();
    const body = await req.json() as GenerateConsequencesRequest;

    const round = body?.gameState?.round || 'n/a';
    const playerCount = body?.players?.length || 0;
    console.log(`[/consequences]: round=${round} playerCount=${playerCount} counterfactualScoreChange=${body?.counterfactualScoreChange || 'n/a'}`);

    if (!body.gameState || !body.players || body.counterfactualScoreChange === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing: gameState, players, counterfactualScoreChange' },
        { status: 400 }
      );
    }

    const result = await generateConsequences(
      body.gameState,
      body.players,
      body.counterfactualScoreChange
    );

    console.log(`[/consequences]: result=${result ? 'OK' : 'NULL'} in ${Date.now() - started}ms`);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate consequences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/consequences] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
