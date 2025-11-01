import { NextRequest, NextResponse } from 'next/server';
import { generateActionOptions } from '@/server/services/llmService';
import type { GenerateActionOptionsRequest } from '@/server/types/llm/requests';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const started = Date.now();
    const body = await req.json() as GenerateActionOptionsRequest;
    
    const playerName = body?.player?.role?.name || 'n/a';
    const round = body?.gameState?.round || 'n/a';
    console.log(`[/action-options]: player=${playerName} round=${round}`);
    
    if (!body.player || !body.gameState) {
      return NextResponse.json(
        { success: false, error: 'Missing: player, gameState' },
        { status: 400 }
      );
    }
    
    const result = await generateActionOptions(
      body.player,
      body.gameState,
      body.previousRoundActions ?? null
    );
    
    console.log(`[/action-options]: result=${result ? 'OK' : 'NULL'} in ${Date.now() - started}ms`);
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate action options' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API /llm/action-options] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
