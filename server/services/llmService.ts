import type {
  GameState,
  Player,
  AIConsequenceResponse,
  ActionOption,
  AIActionOptionsResponse,
  AICounterfactualResponse,
  AITurnResponse,
  PlayerRoundActions,
  GameSetup,
} from "../types/core";
import type { LLMService } from './llm/types';
import { LLM_OPENAI } from './llm/openaiService';
import { LLM_MOCK } from './llm/mockService';
import type { GameChatSession } from './chatSession';

function isMockMode(): boolean {
  return process.env.LLM_MOCK === '1' || process.env.LLM_MODE === 'mock';
}

let _svc: LLMService | null = null;
function getService(): LLMService {
  if (_svc) return _svc;
  _svc = isMockMode() ? LLM_MOCK : LLM_OPENAI;
  console.log(`[LLM SERVICE] Using ${isMockMode() ? 'MOCK' : 'OPENAI'} implementation`);
  return _svc;
}

export const generateInitialScenario = async (): Promise<AIConsequenceResponse | null> => {
  return getService().generateInitialScenario();
};

export const generateConsequences = async (
  gameState: GameState,
  players: Player[],
  counterfactualScoreChange: number
): Promise<AIConsequenceResponse | null> => {
  return getService().generateConsequences(gameState, players, counterfactualScoreChange);
};

export const generateAIPlayerActions = async (
  player: Player,
  gameState: GameState,
  options: ActionOption[]
): Promise<ActionOption[] | null> => {
  return getService().generateAIPlayerActions(player, gameState, options);
};

export const generateActionOptions = async (
  player: Player,
  gameState: GameState,
  previousRoundActions: PlayerRoundActions[] | null
): Promise<AIActionOptionsResponse | null> => {
  return getService().generateActionOptions(player, gameState, previousRoundActions);
};

export const generateCounterfactualConsequences = async (
  gameState: GameState
): Promise<AICounterfactualResponse | null> => {
  return getService().generateCounterfactualConsequences(gameState);
};

export const generateCustomScenario = async (scenarioDescription: string): Promise<GameSetup | null> => {
  return getService().generateCustomScenario(scenarioDescription);
};

export const generateInitialScenarioChat = async (
  session: GameChatSession
): Promise<AIConsequenceResponse | null> => {
  return getService().generateInitialScenarioChat(session);
};

export const generateConsequencesChat = async (
  session: GameChatSession,
  gameState: GameState,
  players: Player[],
  counterfactualScoreChange: number
): Promise<AIConsequenceResponse | null> => {
  return getService().generateConsequencesChat(session, gameState, players, counterfactualScoreChange);
};

export const generateAITurn = async (
  player: Player,
  gameState: GameState,
  previousRoundActions: PlayerRoundActions[] | null
): Promise<AITurnResponse | null> => {
  return getService().generateAITurn(player, gameState, previousRoundActions);
};

export const generateDebriefChat = async (
  session: import('./chatSession').GameChatSession,
  gameState: GameState,
  players: Player[],
  humanRoleName?: string
): Promise<import('../types/core').AIDebriefResponse | null> => {
  return getService().generateDebriefChat(session, gameState, players, humanRoleName);
};
