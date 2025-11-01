import { NextRequest, NextResponse } from 'next/server';
import { generateDebriefChat } from '@/server/services/llmService';
import { GameChatSession } from '@/server/services/chatSession';
import { createGameSession } from '@/server/services/chatSession';
import type { GameSetup, GameState, Player } from '@/server/types/core';
import { requireLLMEnv } from '@/server/lib/env';

export const runtime = 'nodejs';

interface DebriefChatRequest {
  gameSetup?: GameSetup;
  players: Player[];
  gameState: GameState;
  sessionHistory?: Array<{ role: string; content: string }>;
  humanRoleName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const envError = requireLLMEnv();
    if (envError) return envError;

    const started = Date.now();
    const body = await req.json() as DebriefChatRequest;

    if (!body.players || !body.gameState) {
      return NextResponse.json({ success: false, error: 'Missing: players, gameState' }, { status: 400 });
    }

    let session: GameChatSession;
    if (body.sessionHistory && body.sessionHistory.length > 0) {
      const firstMessage = body.sessionHistory[0];
      if (!firstMessage || firstMessage.role !== 'system') {
        return NextResponse.json({ success: false, error: 'Invalid session history: missing system message' }, { status: 400 });
      }
      session = new GameChatSession(firstMessage.content, body.gameSetup as GameSetup, body.players);
      for (let i = 1; i < body.sessionHistory.length; i++) {
        const msg = body.sessionHistory[i];
        (session as any).messages.push({ role: msg.role, content: msg.content });
      }
    } else {
      if (!body.gameSetup) {
        return NextResponse.json({ success: false, error: 'Missing: gameSetup when no sessionHistory provided' }, { status: 400 });
      }
      session = createGameSession(body.gameSetup, body.players);
    }

    const data = await generateDebriefChat(session, body.gameState, body.players, body.humanRoleName);
    const updatedSessionHistory = session.getHistory();

    if (!data) {
      return NextResponse.json({ success: false, error: 'Failed to generate debrief' }, { status: 500 });
    }

    console.log(`[/chat/debrief]: OK in ${Date.now() - started}ms`);
    return NextResponse.json({ success: true, data, sessionHistory: updatedSessionHistory });
  } catch (error) {
    console.error('[API /llm/chat/debrief] Error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

