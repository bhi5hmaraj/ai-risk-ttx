import { NextRequest, NextResponse } from 'next/server';
import { generateAIPlayerActions } from '@/server/services/llmService';
import type { GenerateAIPlayerActionsRequest } from '@/server/types/llm/requests';
import { requireLLMEnv } from '@/server/lib/env';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const envError = requireLLMEnv();
    if (envError) return envError;
    const started = Date.now();
    const body = await req.json() as GenerateAIPlayerActionsRequest;

    const playerName = body?.player?.role?.name || 'n/a';
    const round = body?.gameState?.round || 'n/a';
    console.log(`[/ai-player-actions]: player=${playerName} round=${round} optionsCount=${body?.options?.length || 0}`);

    if (!body.player || !body.gameState || !body.options) {
      return NextResponse.json(
        { success: false, error: 'Missing: player, gameState, options' },
        { status: 400 }
      );
    }

    const result = await generateAIPlayerActions(
      body.player,
      body.gameState,
      body.options
    );

    console.log(`[/ai-player-actions]: result=${result ? `${result.length} actions` : 'NULL'} in ${Date.now() - started}ms`);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate AI player actions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/ai-player-actions] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
