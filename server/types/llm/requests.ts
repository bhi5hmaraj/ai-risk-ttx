import type { GameState, Player, ActionOption, PlayerRoundActions } from "../../types/core";

export interface GenerateInitialScenarioRequest {}

export interface GenerateActionOptionsRequest {
  player: Player;
  gameState: GameState;
  previousRoundActions?: PlayerRoundActions[] | null;
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

export interface GenerateAITurnRequest {
  player: Player;
  gameState: GameState;
  previousRoundActions?: PlayerRoundActions[] | null;
}

