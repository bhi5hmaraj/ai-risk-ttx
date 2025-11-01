/**
 * Frontend API client for LLM endpoints
 * Replaces direct LLM calls with backend API calls
 */

import type {
  GameState,
  Player,
  ActionOption,
  AIConsequenceResponse,
  AIActionOptionsResponse,
  AIPlayerActionsResponse,
  AICounterfactualResponse,
  AITurnResponse,
  PlayerRoundActions,
  GameSetup,
} from '../types';

// Allow overriding API origin for split-ports dev (e.g., Vite on 5173 and API on 3003)
const API_ORIGIN = (import.meta as any).env?.VITE_API_ORIGIN || (process as any).env?.VITE_API_ORIGIN || '';
const API_BASE = API_ORIGIN
  ? `${String(API_ORIGIN).replace(/\/$/, '')}/api/llm`
  : '/api/llm';

// Fetch with robust JSON parsing (no abort signal to avoid dev adapter interference)
async function fetchJson(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, { ...init });
  const reqId = res.headers?.get('x-req-id') || res.headers?.get('X-Req-Id');
  try { console.log('[LLM API Client] status:', res.status, 'x-req-id:', reqId); } catch {}
  let data: any;
  try {
    data = await res.clone().json();
  } catch {
    const txt = await res.text();
    try { data = JSON.parse(txt); } catch { data = { success: false, error: 'Invalid JSON', raw: txt }; }
  }
  return { res, data } as const;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Generate initial scenario for a game
 */
export const generateInitialScenario = async (): Promise<AIConsequenceResponse | null> => {
  try {
    console.log('[LLM API Client] Calling generateInitialScenario...');

    const response = await fetch(`${API_BASE}/initial-scenario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result: ApiResponse<AIConsequenceResponse> = await response.json();

    if (!result.success || !result.data) {
      console.error('[LLM API Client] generateInitialScenario failed:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[LLM API Client] generateInitialScenario error:', error);
    return null;
  }
};

/**
 * Generate action options for a player
 */
export const generateActionOptions = async (
  player: Player,
  gameState: GameState,
  previousRoundActions: PlayerRoundActions[] | null
): Promise<AIActionOptionsResponse | null> => {
  try {
    console.log('[LLM API Client] Calling generateActionOptions...');

    const { res, data } = await fetchJson(`${API_BASE}/action-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ player, gameState, previousRoundActions }),
    });
    const result: ApiResponse<AIActionOptionsResponse> = data;
    try { console.log('[LLM API Client] action-options ok:', result?.success, 'len:', (result as any)?.data?.options?.length ?? (result as any)?.options?.length); } catch {}

    if (!result.success || !result.data) {
      console.error('[LLM API Client] generateActionOptions failed:', result?.error, 'status:', res.status);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[LLM API Client] generateActionOptions error:', error);
    return null;
  }
};

/**
 * Generate AI player's chosen actions
 */
export const generateAIPlayerActions = async (
  player: Player,
  gameState: GameState,
  options: ActionOption[]
): Promise<AIPlayerActionsResponse | null> => {
  try {
    console.log('[LLM API Client] Calling generateAIPlayerActions...');

    const response = await fetch(`${API_BASE}/ai-player-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player,
        gameState,
        options,
      }),
    });

    const result: ApiResponse<AIPlayerActionsResponse> = await response.json();

    if (!result.success || !result.data) {
      console.error('[LLM API Client] generateAIPlayerActions failed:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[LLM API Client] generateAIPlayerActions error:', error);
    return null;
  }
};

/**
 * Generate consequences for a round
 */
export const generateConsequences = async (
  gameState: GameState,
  players: Player[],
  counterfactualScoreChange: number
): Promise<AIConsequenceResponse | null> => {
  try {
    console.log('[LLM API Client] Calling generateConsequences...');

    const response = await fetch(`${API_BASE}/consequences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameState,
        players,
        counterfactualScoreChange,
      }),
    });

    const result: ApiResponse<AIConsequenceResponse> = await response.json();

    if (!result.success || !result.data) {
      console.error('[LLM API Client] generateConsequences failed:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[LLM API Client] generateConsequences error:', error);
    return null;
  }
};

/**
 * Generate counterfactual consequences (what if no one acted)
 */
export const generateCounterfactualConsequences = async (
  gameState: GameState
): Promise<AICounterfactualResponse | null> => {
  try {
    console.log('[LLM API Client] Calling generateCounterfactualConsequences...');

    const response = await fetch(`${API_BASE}/counterfactual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameState,
      }),
    });

    const result: ApiResponse<AICounterfactualResponse> = await response.json();

    if (!result.success || !result.data) {
      console.error('[LLM API Client] generateCounterfactualConsequences failed:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[LLM API Client] generateCounterfactualConsequences error:', error);
    return null;
  }
};

/**
 * Generate custom scenario from user description
 */
export const generateCustomScenario = async (
  scenarioDescription: string
): Promise<GameSetup | null> => {
  try {
    console.log('[LLM API Client] Calling generateCustomScenario...');

    const response = await fetch(`${API_BASE}/custom-scenario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scenarioDescription,
      }),
    });

    const result: ApiResponse<GameSetup> = await response.json();

    if (!result.success || !result.data) {
      console.error('[LLM API Client] generateCustomScenario failed:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[LLM API Client] generateCustomScenario error:', error);
    return null;
  }
};

/**
 * OPTIMIZED: Generate AI turn (options + chosen actions) in one call
 * This replaces calling generateActionOptions + generateAIPlayerActions separately
 * Reduces LLM calls by 50% for AI players
 */
export const generateAITurn = async (
  player: Player,
  gameState: GameState,
  previousRoundActions: PlayerRoundActions[] | null
): Promise<AITurnResponse | null> => {
  try {
    console.log(`[LLM API Client] Calling generateAITurn for ${player.role.name}...`);

    const response = await fetch(`${API_BASE}/ai-turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player,
        gameState,
        previousRoundActions,
      }),
    });

    const result: ApiResponse<AITurnResponse> = await response.json();

    if (!result.success || !result.data) {
      console.error('[LLM API Client] generateAITurn failed:', result.error);
      return null;
    }

    console.log(`[LLM API Client] AI turn complete: ${result.data.options.length} options, ${result.data.chosenActions.length} chosen`);

    return result.data;
  } catch (error) {
    console.error('[LLM API Client] generateAITurn error:', error);
    return null;
  }
};

/**
 * CHAT MODE FUNCTIONS
 * These functions call the backend chat endpoints and manage conversation history
 */

interface ChatInitialScenarioResponse {
  scenario: AIConsequenceResponse;
  chatHistory: any[];
}

interface ChatConsequencesResponse {
  consequences: AIConsequenceResponse;
  chatHistory: any[];
}

/**
 * Generate initial scenario using chat mode (backend)
 */
export const generateInitialScenarioChat = async (
  gameSetup: GameSetup,
  players: Player[]
): Promise<ChatInitialScenarioResponse | null> => {
  try {
    console.log('[LLM API Client] Calling chat/initial-scenario...');

    const response = await fetch(`${API_BASE}/chat/initial-scenario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameSetup,
        players,
      }),
    });

    const result: ApiResponse<ChatInitialScenarioResponse> = await response.json();

    if (!result.success || !result.data) {
      console.error('[LLM API Client] chat/initial-scenario failed:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[LLM API Client] chat/initial-scenario error:', error);
    return null;
  }
};

/**
 * Generate consequences using chat mode (backend)
 */
export const generateConsequencesChat = async (
  gameState: GameState,
  players: Player[],
  counterfactualScoreChange: number,
  chatHistory: any[],
  gameSetup: GameSetup
): Promise<ChatConsequencesResponse | null> => {
  try {
    console.log('[LLM API Client] Calling chat/consequences...');

    const response = await fetch(`${API_BASE}/chat/consequences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameState,
        players,
        counterfactualScoreChange,
        chatHistory,
        gameSetup,
      }),
    });

    const result: ApiResponse<ChatConsequencesResponse> = await response.json();

    if (!result.success || !result.data) {
      console.error('[LLM API Client] chat/consequences failed:', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[LLM API Client] chat/consequences error:', error);
    return null;
  }
};
