/**
 * AI service for game logic
 *
 * This module is self-contained and can be extracted to a separate service later.
 * For now, it makes direct LLM calls. In the future (Milestone 2), this could
 * call a Matrix service instead.
 */

import type {
  GameState,
  Player,
  AIConsequenceResponse,
  ActionOption,
  AIActionOptionsResponse,
  AICounterfactualResponse,
  AITurnResponse,
  PlayerRoundActions,
} from '../../server/types/core';

import { LLM_OPENAI } from '../../server/services/llm/openaiService';
import { LLM_MOCK } from '../../server/services/llm/mockService';
import type { LLMService } from '../../server/services/llm/types';

// Use existing LLM implementations
function isMockMode(): boolean {
  return process.env.LLM_MOCK === '1' || process.env.LLM_MODE === 'mock';
}

let _svc: LLMService | null = null;
function getService(): LLMService {
  if (_svc) return _svc;
  _svc = isMockMode() ? LLM_MOCK : LLM_OPENAI;
  console.log(`[GameServer AI] Using ${isMockMode() ? 'MOCK' : 'OPENAI'} implementation`);
  return _svc;
}

/**
 * Generate action options for a player
 */
export async function generateActionOptions(
  player: Player,
  gameState: GameState,
  previousRoundActions: PlayerRoundActions[] | null
): Promise<AIActionOptionsResponse | null> {
  return getService().generateActionOptions(player, gameState, previousRoundActions);
}

/**
 * Generate AI player's turn (choose actions from options)
 */
export async function generateAITurn(
  player: Player,
  gameState: GameState,
  previousRoundActions: PlayerRoundActions[] | null
): Promise<AITurnResponse | null> {
  return getService().generateAITurn(player, gameState, previousRoundActions);
}

/**
 * Generate counterfactual consequences (what happens if no one acts)
 */
export async function generateCounterfactual(
  gameState: GameState
): Promise<AICounterfactualResponse | null> {
  return getService().generateCounterfactualConsequences(gameState);
}

/**
 * Generate consequences based on all player actions
 */
export async function generateConsequences(
  gameState: GameState,
  players: Player[],
  counterfactualScoreChange: number
): Promise<AIConsequenceResponse | null> {
  return getService().generateConsequences(gameState, players, counterfactualScoreChange);
}

/**
 * FUTURE (Milestone 2): This is where you'd call Matrix instead
 *
 * Example extraction:
 *
 * export async function generateAITurn(...) {
 *   if (process.env.USE_MATRIX === '1') {
 *     return await fetch(`${MATRIX_URL}/intelligence/agents/${player.role}/respond`, {
 *       method: 'POST',
 *       body: JSON.stringify({ gameState, previousRoundActions })
 *     }).then(r => r.json());
 *   }
 *
 *   // Fallback to direct LLM call
 *   return getService().generateAITurn(player, gameState, previousRoundActions);
 * }
 */
