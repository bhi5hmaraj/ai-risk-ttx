import type { GameSetup, GameEvent } from '../types/core';

/**
 * Types for Public Scenario Submission and Storage
 *
 * Reuses existing game types to ensure consistency and maintainability.
 */

// Moderation status enum
export const ScenarioStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ScenarioStatusType = typeof ScenarioStatus[keyof typeof ScenarioStatus];

// Complete public scenario data structure
// Reuses GameSetup (has scenarioTitle, scenarioDescription, coreMetric, stakeholders)
// and GameEvent (has headline, detail) from types.ts
export interface PublicScenarioData {
  customPrompt: string;           // User's original input
  gameSetup: GameSetup;            // Reuses existing type!
  initialEvent: GameEvent;         // Reuses existing type!
}

// Full database record (includes moderation fields)
export interface PublicScenario extends PublicScenarioData {
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // Moderation
  status: ScenarioStatusType;
  submitterName: string | null;   // null = anonymous
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  rejectionReason: string | null;

  // Engagement
  voteCount: number;
}

// API types
export interface SubmitScenarioRequest {
  scenarioData: PublicScenarioData;
  submitterName?: string;
}

export interface SubmitScenarioResponse {
  success: boolean;
  id?: string;
  error?: string;
}
