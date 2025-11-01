import { NextRequest, NextResponse } from 'next/server';
import { generateAITurn } from '@/server/services/llmService';
import type { GenerateAITurnRequest } from '@/server/types/llm/requests';
import { requireLLMEnv } from '@/server/lib/env';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const envError = requireLLMEnv();
    if (envError) return envError;
    const started = Date.now();
    const body = await req.json() as GenerateAITurnRequest;

    const playerName = body?.player?.role?.name || 'n/a';
    const round = body?.gameState?.round || 'n/a';
    console.log(`[/ai-turn]: player=${playerName} round=${round}`);

    if (!body.player || !body.gameState) {
      return NextResponse.json(
        { success: false, error: 'Missing: player, gameState' },
        { status: 400 }
      );
    }

    const result = await generateAITurn(
      body.player,
      body.gameState,
      body.previousRoundActions ?? null
    );

    console.log(`[/ai-turn]: result=${result ? `optionsCount=${result.options.length} chosenCount=${result.chosenActions.length}` : 'NULL'} in ${Date.now() - started}ms`);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate AI turn' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/ai-turn] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
