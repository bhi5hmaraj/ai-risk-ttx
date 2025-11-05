import { z } from 'zod';

/**
 * Canonical Scenario Schema (Phase 1)
 *
 * This is the single source of truth for scenario/setup data across the entire system.
 * Used by:
 * - Client when creating sessions (all modes: classic, ai_safety, custom)
 * - Server for validation and storage
 * - LLM service for structured outputs
 *
 * IMPORTANT: Per LLM structured output requirements, this schema:
 * - Uses .nullable() instead of .optional() for flexible fields
 * - Avoids .default() in favor of explicit nullability
 * - Keeps all required fields strict (no optionality unless truly optional)
 *
 * Migration Status: Phase 1 - Canonical schema established
 * See: MIGRATION_STATUS.md lines 410-414
 */

/**
 * Core Metric: Represents the shared public score
 * (e.g., "Democratic Legitimacy", "Public Trust", etc.)
 */
export const CoreMetricSchema = z.object({
  name: z.string().min(1, "Core metric name required"),
  description: z.string().min(1, "Core metric description required"),
  value: z.number().int().min(0).max(100),
});

/**
 * Stakeholder: A single actor/role in the scenario
 * Each stakeholder becomes a Player (human or AI) during the game
 */
export const StakeholderSchema = z.object({
  name: z.string().min(1, "Stakeholder name required"),
  icon: z.string().min(1, "Stakeholder icon (emoji) required"),
  publicObjective: z.string().min(1, "Public objective required"),
  hiddenObjective: z.string().min(1, "Hidden objective required"),

  // Resources and constraints are arrays of strings
  // Use .nullable() to allow LLM to omit or explicitly set null
  // Empty arrays should be passed as [], not null
  resources: z.array(z.string()).nullable(),
  constraints: z.array(z.string()).nullable(),
});

/**
 * Canonical Game Setup Schema
 *
 * This represents the complete scenario configuration that defines:
 * - What crisis/scenario is being simulated
 * - What the shared goal is (coreMetric)
 * - Who the actors are (stakeholders)
 *
 * This schema is ALWAYS required when creating a session (all modes).
 * No fallbacks, no optionality - client must build and send full setup.
 */
export const CanonicalGameSetupSchema = z.object({
  scenarioTitle: z.string().min(1, "Scenario title required"),
  scenarioDescription: z.string().min(1, "Scenario description required"),
  coreMetric: CoreMetricSchema,

  // Stakeholders array must have at least 2 actors
  // For classic/ai_safety modes: 4-6 stakeholders
  // For custom mode: minimum 2 stakeholders
  stakeholders: z.array(StakeholderSchema).min(2, "At least 2 stakeholders required"),

  // Optional game configuration overrides
  // Use .nullable() to allow explicit null or omission
  maxRounds: z.number().int().min(1).max(50).nullable(),
  maxAIPlayers: z.number().int().min(0).max(10).nullable(),
});

// Type exports for TypeScript consumers (using plain interfaces for compatibility)
export interface CoreMetric {
  name: string;
  description: string;
  value: number;
}

export interface Stakeholder {
  name: string;
  icon: string;
  publicObjective: string;
  hiddenObjective: string;
  resources: string[] | null;
  constraints: string[] | null;
}

export interface CanonicalGameSetup {
  scenarioTitle: string;
  scenarioDescription: string;
  coreMetric: CoreMetric;
  stakeholders: Stakeholder[];
  maxRounds: number | null;
  maxAIPlayers: number | null;
}

/**
 * Validation helper: Ensures resources and constraints are properly defaulted
 * Converts null to empty arrays for internal use
 */
export function normalizeStakeholder(stakeholder: Stakeholder): Required<Stakeholder> {
  return {
    ...stakeholder,
    resources: stakeholder.resources ?? [],
    constraints: stakeholder.constraints ?? [],
  };
}

/**
 * Validation helper: Normalizes entire setup
 */
export function normalizeGameSetup(setup: CanonicalGameSetup): CanonicalGameSetup & {
  stakeholders: Array<Required<Stakeholder>>;
  maxRounds: number;
  maxAIPlayers: number;
} {
  return {
    ...setup,
    stakeholders: setup.stakeholders.map(normalizeStakeholder),
    maxRounds: setup.maxRounds ?? 5,
    maxAIPlayers: setup.maxAIPlayers ?? 5,
  };
}
