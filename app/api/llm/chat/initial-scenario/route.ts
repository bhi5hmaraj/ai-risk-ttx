import { NextRequest, NextResponse } from 'next/server';
import { generateInitialScenarioChat } from '@/server/services/llmService';
import { createGameSession } from '@/server/services/chatSession';
import type { GameSetup, Player } from '@/server/types/core';

export const runtime = 'nodejs';

interface CreateInitialScenarioChatRequest {
  gameSetup: GameSetup;
  players: Player[];
}

export async function POST(req: NextRequest) {
  try {
    const started = Date.now();
    const body = await req.json() as CreateInitialScenarioChatRequest;

    const scenarioTitle = body?.gameSetup?.scenarioTitle || 'n/a';
    const playerCount = body?.players?.length || 0;
    console.log(`[/chat/initial-scenario]: scenario="${scenarioTitle}" playerCount=${playerCount}`);

    if (!body.gameSetup || !body.players || body.players.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid: gameSetup, players' },
        { status: 400 }
      );
    }

    const session = createGameSession(body.gameSetup, body.players);
    const result = await generateInitialScenarioChat(session);

    console.log(`[/chat/initial-scenario]: result=${result ? 'OK' : 'NULL'} in ${Date.now() - started}ms`);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate initial scenario' },
        { status: 500 }
      );
    }

    // Store session history for subsequent requests
    const sessionHistory = session.getHistory();

    return NextResponse.json({ success: true, data: result, sessionHistory });
  } catch (error) {
    console.error('[API /llm/chat/initial-scenario] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
