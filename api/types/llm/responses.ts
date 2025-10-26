import type {
  AIConsequenceResponse,
  AIActionOptionsResponse,
  AIPlayerActionsResponse,
  AICounterfactualResponse,
  GameSetup,
} from "../../../types";

/**
 * API Response types for LLM endpoints
 */

export interface LLMApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Specific response types
export type GenerateInitialScenarioResponse = LLMApiResponse<AIConsequenceResponse>;
export type GenerateActionOptionsResponse = LLMApiResponse<AIActionOptionsResponse>;
export type GenerateAIPlayerActionsResponse = LLMApiResponse<AIPlayerActionsResponse>;
export type GenerateConsequencesResponse = LLMApiResponse<AIConsequenceResponse>;
export type GenerateCounterfactualResponse = LLMApiResponse<AICounterfactualResponse>;
export type GenerateCustomScenarioResponse = LLMApiResponse<GameSetup>;

// Chat session response
export interface CreateChatSessionResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}
