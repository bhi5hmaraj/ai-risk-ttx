/**
 * LLM API Handlers Library
 * All business logic for LLM endpoints consolidated here for testability and reuse
 */

import { NextResponse } from 'next/server';
import { requireLLMEnv } from '@/server/lib/env';
import { createReqId, getReqIdFromHeaders, slog } from '@/server/lib/logger';
import {
  generateInitialScenarioChat,
  generateConsequencesChat,
  generateAITurn,
  generateCounterfactualConsequences,
  generateCustomScenario,
  generateDebriefChat,
  generateActionOptions,
  generateAIPlayerActions,
} from '@/server/services/llmService';
import { createGameSession, type GameChatSession } from '@/server/services/chatSession';
import type { GameSetup, Player, GameState, PlayerRoundActions, ActionOption } from '@/server/types/core';

// ============================================================================
// HANDLER: Generate Initial Scenario
// ============================================================================
export async function handleGenerateScenario(body: {
  gameSetup: GameSetup;
  players: Player[];
}) {
  const started = Date.now();
  const rid = createReqId('llm');
  const scenarioTitle = body?.gameSetup?.scenarioTitle || 'n/a';
  const playerCount = body?.players?.length || 0;
  slog(rid, `[generate/scenario] start`, { scenario: scenarioTitle, playerCount });

  if (!body.gameSetup || !body.players || body.players.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid: gameSetup, players' },
      { status: 400 }
    );
  }

  const session = createGameSession(body.gameSetup, body.players);
  const result = await generateInitialScenarioChat(session);

  slog(rid, `[generate/scenario] done`, { ok: !!result, dt: Date.now() - started });

  if (!result) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate initial scenario' },
      { status: 500 }
    );
  }

  const chatHistory = session.getHistory();
  return NextResponse.json({ success: true, data: { scenario: result, chatHistory } });
}

// ============================================================================
// HANDLER: Generate Consequences
// ============================================================================
export async function handleGenerateConsequences(body: {
  gameState: GameState;
  players: Player[];
  counterfactualScoreChange: number;
  chatHistory: any[];
  gameSetup: GameSetup;
}) {
  const started = Date.now();
  const rid = createReqId('llm');
  const round = body?.gameState?.round || 'n/a';
  slog(rid, `[generate/consequences] start`, { round });

  if (!body.gameState || !body.players || !body.chatHistory || !body.gameSetup) {
    return NextResponse.json(
      { success: false, error: 'Missing: gameState, players, chatHistory, or gameSetup' },
      { status: 400 }
    );
  }

  const session = createGameSession(body.gameSetup, body.players);
  // Restore chat history by manually pushing messages
  for (let i = 1; i < body.chatHistory.length; i++) {
    const msg = body.chatHistory[i];
    (session as any).messages.push({ role: msg.role, content: msg.content });
  }

  const result = await generateConsequencesChat(
    session,
    body.gameState,
    body.players,
    body.counterfactualScoreChange
  );

  slog(rid, `[generate/consequences] done`, { ok: !!result, dt: Date.now() - started });

  if (!result) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate consequences' },
      { status: 500 }
    );
  }

  const chatHistory = session.getHistory();
  return NextResponse.json({ success: true, data: { consequences: result, chatHistory } });
}

// ============================================================================
// HANDLER: Generate Debrief
// ============================================================================
export async function handleGenerateDebrief(body: {
  gameState: GameState;
  players: Player[];
  humanRoleName?: string;
  gameSetup?: GameSetup;
  chatHistory?: any[];
}) {
  const started = Date.now();
  const rid = createReqId('llm');
  slog(rid, `[generate/debrief] start`, { round: body.gameState?.round || 'n/a' });

  if (!body.gameState || !body.players) {
    return NextResponse.json(
      { success: false, error: 'Missing: gameState or players' },
      { status: 400 }
    );
  }

  let session: GameChatSession;
  if (body.chatHistory && body.chatHistory.length > 0 && body.gameSetup) {
    // Restore from chat history
    session = createGameSession(body.gameSetup, body.players);
    for (let i = 1; i < body.chatHistory.length; i++) {
      const msg = body.chatHistory[i];
      (session as any).messages.push({ role: msg.role, content: msg.content });
    }
  } else {
    // Create fallback session for debrief
    const setup = body.gameSetup ?? {
      scenarioTitle: body.gameState.currentEvent?.headline || 'Simulation Debrief',
      scenarioDescription: body.gameState.currentEvent?.detail || 'Auto-generated debrief context.',
      coreMetric: body.gameState.coreMetric || { name: 'Public Trust', description: 'Shared public metric', value: 50 },
      stakeholders: body.players.map(p => ({
        name: p.role.name,
        icon: '👤',
        publicObjective: p.role.publicObjective,
        hiddenObjective: p.role.hiddenObjective,
      })),
    };
    session = createGameSession(setup, body.players);
  }

  const result = await generateDebriefChat(
    session,
    body.gameState,
    body.players,
    body.humanRoleName,
    body.gameSetup
  );

  console.log(`[generate/debrief]: result=${result ? 'OK' : 'NULL'} in ${Date.now() - started}ms`);

  if (!result) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate debrief' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: result });
}

// ============================================================================
// HANDLER: Generate AI Turn
// ============================================================================
export async function handleGenerateAITurn(body: {
  player: Player;
  gameState: GameState;
  previousRoundActions: PlayerRoundActions[] | null;
}) {
  try {
    const started = Date.now();
    const playerName = body?.player?.role?.name || 'n/a';
    const round = body?.gameState?.round || 'n/a';
    console.log(`[generate/ai-turn]: player=${playerName} round=${round}`);

    if (!body.player || !body.gameState) {
      return NextResponse.json(
        { success: false, error: 'Missing: player or gameState' },
        { status: 400 }
      );
    }

    const result = await generateAITurn(
      body.player,
      body.gameState,
      body.previousRoundActions ?? null
    );

    console.log(`[generate/ai-turn]: result=${result ? 'OK' : 'NULL'} in ${Date.now() - started}ms`);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate AI turn' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HANDLER: Generate Custom Scenario
// ============================================================================
export async function handleGenerateCustomScenario(body: {
  scenarioDescription: string;
}) {
  const started = Date.now();
  const rid = createReqId('llm');
  slog(rid, `[generate/custom-scenario] start`, { len: body.scenarioDescription?.length || 0 });

  if (!body.scenarioDescription || body.scenarioDescription.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Missing or empty: scenarioDescription' },
      { status: 400 }
    );
  }

  const result = await generateCustomScenario(body.scenarioDescription);

  slog(rid, `[generate/custom-scenario] done`, { ok: !!result, dt: Date.now() - started });

  if (!result) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate custom scenario' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: result });
}

// ============================================================================
// HANDLER: Generate Counterfactual
// ============================================================================
export async function handleGenerateCounterfactual(body: {
  gameState: GameState;
}) {
  try {
    const started = Date.now();
    const rid = createReqId('llm');
    const round = body?.gameState?.round || 'n/a';
    slog(rid, `[generate/counterfactual] start`, { round });

    if (!body.gameState) {
      return NextResponse.json(
        { success: false, error: 'Missing: gameState' },
        { status: 400 }
      );
    }

    const result = await generateCounterfactualConsequences(body.gameState);

    slog(rid, `[generate/counterfactual] done`, { ok: !!result, dt: Date.now() - started });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate counterfactual' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HANDLER: Generate Action Options
// ============================================================================
export async function handleGenerateActionOptions(body: {
  player: Player;
  gameState: GameState;
  previousRoundActions: PlayerRoundActions[] | null;
}) {
  try {
    const started = Date.now();
    const rid = createReqId('llm');
    const playerName = body?.player?.role?.name || 'n/a';
    const round = body?.gameState?.round || 'n/a';
    slog(rid, `[generate/action-options] start`, { player: playerName, round });

    if (!body.player || !body.gameState) {
      return NextResponse.json(
        { success: false, error: 'Missing: player or gameState' },
        { status: 400 }
      );
    }

    const result = await generateActionOptions(
      body.player,
      body.gameState,
      body.previousRoundActions ?? null
    );

    slog(rid, `[generate/action-options] done`, { ok: !!result, dt: Date.now() - started });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate action options' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HANDLER: Generate AI Player Actions
// ============================================================================
export async function handleGenerateAIPlayerActions(body: {
  player: Player;
  gameState: GameState;
  options: ActionOption[];
}) {
  const started = Date.now();
  const rid = createReqId('llm');
  const playerName = body?.player?.role?.name || 'n/a';
  const round = body?.gameState?.round || 'n/a';
  slog(rid, `[generate/ai-player-actions] start`, { player: playerName, round, options: body?.options?.length || 0 });

  if (!body.player || !body.gameState || !body.options) {
    return NextResponse.json(
      { success: false, error: 'Missing: player, gameState, or options' },
      { status: 400 }
    );
  }

  const result = await generateAIPlayerActions(
    body.player,
    body.gameState,
    body.options
  );

  slog(rid, `[generate/ai-player-actions] done`, { actions: result ? result.length : 0, ok: !!result, dt: Date.now() - started });

  if (!result) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate AI player actions' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: result });
}

// ============================================================================
// HANDLER: Meta Status (Health + Env)
// ============================================================================
export async function handleMetaStatus() {
  const envError = requireLLMEnv();
  if (envError) return envError;

  return NextResponse.json({
    ok: true,
    model: process.env.LLM_MODEL || 'unknown',
    baseURL: process.env.LITELLM_BASE_URL || 'unknown',
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// HANDLER ROUTER
// ============================================================================
export const LLM_HANDLERS = {
  'scenario': handleGenerateScenario,
  'consequences': handleGenerateConsequences,
  'debrief': handleGenerateDebrief,
  'ai-turn': handleGenerateAITurn,
  'custom-scenario': handleGenerateCustomScenario,
  'counterfactual': handleGenerateCounterfactual,
  'action-options': handleGenerateActionOptions,
  'ai-player-actions': handleGenerateAIPlayerActions,
} as const;

export type LLMAction = keyof typeof LLM_HANDLERS;
