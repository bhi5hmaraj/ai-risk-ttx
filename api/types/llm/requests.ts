import type { GameState, Player, ActionOption } from "../../../types";

/**
 * API Request types for LLM endpoints
 */

export interface GenerateInitialScenarioRequest {
  // Empty - uses default scenario
}

export interface GenerateActionOptionsRequest {
  player: Player;
  gameState: GameState;
  previousActions: ActionOption[];
}

export interface GenerateAIPlayerActionsRequest {
  player: Player;
  gameState: GameState;
  options: ActionOption[];
}

export interface GenerateConsequencesRequest {
  gameState: GameState;
  players: Player[];
  counterfactualScoreChange: number;
}

export interface GenerateCounterfactualRequest {
  gameState: GameState;
}

export interface GenerateCustomScenarioRequest {
  scenarioDescription: string;
}

// Chat mode requests
export interface GenerateInitialScenarioChatRequest {
  sessionId: string;
}

export interface GenerateConsequencesChatRequest {
  sessionId: string;
  gameState: GameState;
  players: Player[];
  counterfactualScoreChange: number;
}

// Session management
export interface CreateChatSessionRequest {
  gameSetup: any; // GameSetup type
  players: Player[];
}
