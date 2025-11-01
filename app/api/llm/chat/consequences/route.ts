import { NextRequest, NextResponse } from 'next/server';
import { generateConsequencesChat } from '@/server/services/llmService';
import { GameChatSession } from '@/server/services/chatSession';
import type { GameSetup, GameState, Player } from '@/server/types/core';

export const runtime = 'nodejs';

interface GenerateConsequencesChatRequest {
  gameSetup: GameSetup;
  players: Player[];
  gameState: GameState;
  counterfactualScoreChange: number;
  sessionHistory: Array<{ role: string; content: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const started = Date.now();
    const body = await req.json() as GenerateConsequencesChatRequest;

    const round = body?.gameState?.round || 'n/a';
    const playerCount = body?.players?.length || 0;
    console.log(`[/chat/consequences]: round=${round} playerCount=${playerCount}`);

    if (!body.gameSetup || !body.players || !body.gameState || body.counterfactualScoreChange === undefined || !body.sessionHistory) {
      return NextResponse.json(
        { success: false, error: 'Missing: gameSetup, players, gameState, counterfactualScoreChange, sessionHistory' },
        { status: 400 }
      );
    }

    // Restore session from history
    const firstMessage = body.sessionHistory[0];
    if (!firstMessage || firstMessage.role !== 'system') {
      return NextResponse.json(
        { success: false, error: 'Invalid session history: missing system message' },
        { status: 400 }
      );
    }

    const session = new GameChatSession(firstMessage.content, body.gameSetup, body.players);

    // Restore conversation history (skip system message, add the rest)
    for (let i = 1; i < body.sessionHistory.length; i++) {
      const msg = body.sessionHistory[i];
      // Reconstruct messages by accessing private property (workaround for API compatibility)
      (session as any).messages.push({ role: msg.role, content: msg.content });
    }

    const result = await generateConsequencesChat(
      session,
      body.gameState,
      body.players,
      body.counterfactualScoreChange
    );

    console.log(`[/chat/consequences]: result=${result ? 'OK' : 'NULL'} in ${Date.now() - started}ms`);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate consequences' },
        { status: 500 }
      );
    }

    // Return updated session history for next request
    const updatedSessionHistory = session.getHistory();

    return NextResponse.json({ success: true, data: result, sessionHistory: updatedSessionHistory });
  } catch (error) {
    console.error('[API /llm/chat/consequences] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
