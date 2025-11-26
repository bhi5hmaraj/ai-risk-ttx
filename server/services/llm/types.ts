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
} from "../../types/core";

import type { GameChatSession } from '../chatSession';

export interface LLMService {
  generateInitialScenario(): Promise<AIConsequenceResponse | null>;
  generateConsequences(
    gameState: GameState,
    players: Player[],
    counterfactualScoreChange: number
  ): Promise<AIConsequenceResponse | null>;
  generateAIPlayerActions(
    player: Player,
    gameState: GameState,
    options: ActionOption[]
  ): Promise<ActionOption[] | null>;
  generateActionOptions(
    player: Player,
    gameState: GameState,
    previousRoundActions: PlayerRoundActions[] | null
  ): Promise<AIActionOptionsResponse | null>;
  generateCounterfactualConsequences(
    gameState: GameState
  ): Promise<AICounterfactualResponse | null>;
  generateCustomScenario(scenarioDescription: string, aiPlayers?: number): Promise<GameSetup | null>;

  // Chat-session variants
  generateInitialScenarioChat(session: GameChatSession): Promise<AIConsequenceResponse | null>;
  generateConsequencesChat(
    session: GameChatSession,
    gameState: GameState,
    players: Player[],
    counterfactualScoreChange: number
  ): Promise<AIConsequenceResponse | null>;
  generateAITurn(
    player: Player,
    gameState: GameState,
    previousRoundActions: PlayerRoundActions[] | null
  ): Promise<AITurnResponse | null>;

  // Debrief
  generateDebriefChat(
    session: GameChatSession,
    gameState: GameState,
    players: Player[],
    humanRoleName?: string,
    gameSetup?: GameSetup
  ): Promise<import('../../types/core').AIDebriefResponse | null>;
}
