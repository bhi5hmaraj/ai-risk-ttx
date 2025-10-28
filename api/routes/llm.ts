import { Hono } from 'hono';
import { logDebug, sanitizeHeaders } from '../lib/logger';
import { readJsonBody } from '../lib/request';
import {
  generateInitialScenario,
  generateActionOptions,
  generateAIPlayerActions,
  generateConsequences,
  generateCounterfactualConsequences,
  generateCustomScenario,
  generateAITurn,
  generateInitialScenarioChat,
  generateConsequencesChat,
} from '../services/llmService';
import {
  createGameSession,
  GameChatSession,
  createGameMasterSystemPrompt,
} from '../services/chatSession';
import type {
  GenerateActionOptionsRequest,
  GenerateAIPlayerActionsRequest,
  GenerateConsequencesRequest,
  GenerateCounterfactualRequest,
  GenerateCustomScenarioRequest,
  GenerateAITurnRequest,
} from '../types/llm/requests';

const llm = new Hono();

// Simple health check for readiness probes
llm.get('/health', (c) => c.json({ ok: true }));
// Hono may not expose .head() in all versions; use .on('HEAD', ...)
llm.on('HEAD', '/health', (c) => c.body(null, 200));

/**
 * POST /api/llm/initial-scenario
 * Generate the initial scenario for a game
 */
llm.post('/initial-scenario', async (c) => {
  try {
    console.log('[API /llm/initial-scenario] ✓ Request received');
    try { logDebug('Headers:', sanitizeHeaders((c.req as any)?.raw?.headers || (c.req as any)?.headers)); } catch {}
    console.log('[API /llm/initial-scenario] → Calling generateInitialScenario()...');

    const result = await generateInitialScenario();

    console.log('[API /llm/initial-scenario] ✓ Got result:', result ? 'SUCCESS' : 'NULL');

    if (!result) {
      console.log('[API /llm/initial-scenario] ✗ Result was null, returning 500');
      return c.json({
        success: false,
        error: 'Failed to generate initial scenario',
      }, 500);
    }

    console.log('[API /llm/initial-scenario] ✓ Returning success response');
    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /llm/initial-scenario] ✗ Exception caught:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/llm/action-options
 * Generate action options for a player
 */
llm.post('/action-options', async (c) => {
  try {
    console.log('[API /llm/action-options] Request received');

    const body = await readJsonBody<GenerateActionOptionsRequest>(c);
    try { logDebug('Body keys:', Object.keys(body || {})); } catch {}

    if (!body.player || !body.gameState) {
      return c.json({
        success: false,
        error: 'Missing required fields: player, gameState',
      }, 400);
    }

    const result = await generateActionOptions(
      body.player,
      body.gameState,
      body.previousRoundActions ?? null
    );

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate action options',
      }, 500);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /llm/action-options] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/llm/ai-player-actions
 * Generate AI player's chosen actions from their options
 */
llm.post('/ai-player-actions', async (c) => {
  try {
    console.log('[API /llm/ai-player-actions] Request received');

    const body = await readJsonBody<GenerateAIPlayerActionsRequest>(c);
    try { logDebug('Body keys:', Object.keys(body || {})); } catch {}

    if (!body.player || !body.gameState || !body.options) {
      return c.json({
        success: false,
        error: 'Missing required fields: player, gameState, options',
      }, 400);
    }

    const result = await generateAIPlayerActions(
      body.player,
      body.gameState,
      body.options
    );

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate AI player actions',
      }, 500);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /llm/ai-player-actions] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/llm/consequences
 * Generate consequences for a round
 */
llm.post('/consequences', async (c) => {
  try {
    console.log('[API /llm/consequences] Request received');

    const body = await readJsonBody<GenerateConsequencesRequest>(c);
    try { logDebug('Body keys:', Object.keys(body || {})); } catch {}

    if (!body.gameState || !body.players || body.counterfactualScoreChange === undefined) {
      return c.json({
        success: false,
        error: 'Missing required fields: gameState, players, counterfactualScoreChange',
      }, 400);
    }

    const result = await generateConsequences(
      body.gameState,
      body.players,
      body.counterfactualScoreChange
    );

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate consequences',
      }, 500);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /llm/consequences] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/llm/counterfactual
 * Generate counterfactual consequences (what would happen if no one acted)
 */
llm.post('/counterfactual', async (c) => {
  try {
    console.log('[API /llm/counterfactual] Request received');

    const body = await readJsonBody<GenerateCounterfactualRequest>(c);
    try { logDebug('Body keys:', Object.keys(body || {})); } catch {}

    if (!body.gameState) {
      return c.json({
        success: false,
        error: 'Missing required field: gameState',
      }, 400);
    }

    const result = await generateCounterfactualConsequences(body.gameState);

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate counterfactual consequences',
      }, 500);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /llm/counterfactual] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/llm/custom-scenario
 * Generate a custom scenario from a user description
 */
llm.post('/custom-scenario', async (c) => {
  try {
    console.log('[API /llm/custom-scenario] Request received');

    const body = await readJsonBody<GenerateCustomScenarioRequest>(c);
    try { logDebug('Body keys:', Object.keys(body || {})); } catch {}

    if (!body.scenarioDescription) {
      return c.json({
        success: false,
        error: 'Missing required field: scenarioDescription',
      }, 400);
    }

    const result = await generateCustomScenario(body.scenarioDescription);

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate custom scenario',
      }, 500);
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /llm/custom-scenario] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/llm/ai-turn
 * OPTIMIZED: Generate both options and chosen actions for an AI player in one call
 * Replaces calling /action-options + /ai-player-actions separately
 */
llm.post('/ai-turn', async (c) => {
  try {
    console.log('[API /llm/ai-turn] Request received');

    const body = await readJsonBody<GenerateAITurnRequest>(c);
    try { logDebug('Body keys:', Object.keys(body || {})); } catch {}

    if (!body.player || !body.gameState) {
      return c.json({
        success: false,
        error: 'Missing required fields: player, gameState',
      }, 400);
    }

    const result = await generateAITurn(
      body.player,
      body.gameState,
      body.previousRoundActions || null
    );

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate AI turn',
      }, 500);
    }

    console.log(`[API /llm/ai-turn] Generated ${result.options.length} options, ${result.chosenActions.length} chosen for ${body.player.role.name}`);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API /llm/ai-turn] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/llm/chat/initial-scenario
 * Generate initial scenario using chat mode (stateless with history passing)
 */
llm.post('/chat/initial-scenario', async (c) => {
  try {
    console.log('[API /llm/chat/initial-scenario] Request received');

    const body = await readJsonBody<{
      gameSetup: any;
      players: any[];
    }>(c);

    if (!body.gameSetup || !body.players) {
      return c.json({
        success: false,
        error: 'Missing required fields: gameSetup, players',
      }, 400);
    }

    // Create new session and generate initial scenario
    const session = createGameSession(body.gameSetup, body.players);
    const result = await generateInitialScenarioChat(session);

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate initial scenario',
      }, 500);
    }

    return c.json({
      success: true,
      data: {
        scenario: result,
        chatHistory: session.getHistory(),
      },
    });
  } catch (error) {
    console.error('[API /llm/chat/initial-scenario] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/llm/chat/consequences
 * Generate consequences using chat mode (stateless with history passing)
 */
llm.post('/chat/consequences', async (c) => {
  try {
    console.log('[API /llm/chat/consequences] Request received');

    const body = await readJsonBody<{
      gameState: any;
      players: any[];
      counterfactualScoreChange: number;
      chatHistory: any[];
      gameSetup: any;
    }>(c);

    if (!body.gameState || !body.players || body.counterfactualScoreChange === undefined || !body.chatHistory || !body.gameSetup) {
      return c.json({
        success: false,
        error: 'Missing required fields: gameState, players, counterfactualScoreChange, chatHistory, gameSetup',
      }, 400);
    }

    // Restore session from history and generate consequences
    // Recreate session with existing history
    const systemPrompt = createGameMasterSystemPrompt(body.gameSetup, body.players);
    const session = new GameChatSession(systemPrompt, body.gameSetup, body.players);

    // Restore conversation history (skip first message as it's the system prompt)
    for (let i = 1; i < body.chatHistory.length; i++) {
      (session as any).messages.push(body.chatHistory[i]);
    }

    const result = await generateConsequencesChat(
      session,
      body.gameState,
      body.players,
      body.counterfactualScoreChange
    );

    if (!result) {
      return c.json({
        success: false,
        error: 'Failed to generate consequences',
      }, 500);
    }

    return c.json({
      success: true,
      data: {
        consequences: result,
        chatHistory: session.getHistory(),
      },
    });
  } catch (error) {
    console.error('[API /llm/chat/consequences] Error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export default llm;
