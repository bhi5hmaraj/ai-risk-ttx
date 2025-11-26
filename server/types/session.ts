import { z } from 'zod';
import { GAME_CONFIG } from '../../gameConfig';
import {
  CoreMetricSchema,
  CanonicalGameSetupSchema,
  type CanonicalGameSetup,
  type CoreMetric,
  type Stakeholder,
} from './scenario';

// Re-export canonical schema types for backward compatibility
export { CoreMetricSchema, type CoreMetric, type Stakeholder };
export type GameSetup = CanonicalGameSetup;

export const ActionOptionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  cost: z.number().int().min(1).max(10),
});

export const RoleDataCoreSchema = z.object({
  name: z.string().min(1),
  publicObjective: z.string().min(1),
  hiddenObjective: z.string().min(1),
  resources: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
});

export const PlayerCoreSchema = z.object({
  id: z.string().min(1),
  role: RoleDataCoreSchema,
  isHuman: z.boolean(),
  hiddenScore: z.number().int(),
  actionPoints: z.number().int().min(0),
  actions: z.array(ActionOptionSchema),
  hasSubmittedActions: z.boolean(),
});

export const GameEventSchema = z.object({
  id: z.string().optional(),
  headline: z.string().min(1),
  detail: z.string().min(1),
});

export const OutcomeTimelineItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  impact: z.string().min(1),
  // Interpretability citations — required+nullable pattern kept in API responses
  causes: z
    .array(
      z.object({
        type: z.enum(['event', 'action', 'exogenous']),
        ref: z.string().min(1),
        rationale: z.string().min(1),
      })
    )
    .nullable()
    .optional(),
});

export const HiddenScoreChangeSchema = z.object({
  update: z.number(),
  justification: z.string(),
});

export const GameLogEntrySchema = z.object({
  round: z.number().int().min(0),
  roundSummary: z.string(),
  outcomeTimeline: z.array(OutcomeTimelineItemSchema),
  counterfactualNote: z.string(),
  event: GameEventSchema.nullable(),
  playerActions: z.array(
    z.object({
      roleName: z.string(),
      actions: z.array(ActionOptionSchema),
      availableOptions: z.array(ActionOptionSchema),
      isHuman: z.boolean(),
    })
  ),
  publicScoreChange: z.number().int(),
  publicScoreAfter: z.number().int().min(0).max(100),
  hiddenScoreChanges: z.record(HiddenScoreChangeSchema),
  geminiCalls: z.number().int().min(0),
  citations: z
    .array(
      z.object({
        type: z.enum(['event', 'action', 'exogenous']),
        ref: z.string().min(1),
        rationale: z.string().min(1),
      })
    )
    .optional(),
});

export const GameStateSchema = z.object({
  phase: z.number().int().min(0).max(10), // GamePhase enum numeric
  round: z.number().int().min(0),
  coreMetric: CoreMetricSchema,
  eventLog: z.array(GameLogEntrySchema),
  currentEvent: GameEventSchema.nullable(),
});

// Use canonical schema from scenario.ts (Phase 1: Unified schema)
export const GameSetupSchema = CanonicalGameSetupSchema;

// API Envelopes
export const ApiSuccessSchema = (data: any) => z.object({ success: z.literal(true), data });
export const ApiErrorSchema = z.object({ success: z.literal(false), error: z.string().min(1) });

// Session contracts
export const CreateSessionRequestSchema = z.object({
  mode: z.enum(['classic', 'ai_safety', 'custom']).default('classic'),
  // Phase 0.2: setup is now REQUIRED (no fallbacks)
  // Phase 1: Uses canonical schema from scenario.ts
  setup: GameSetupSchema,
  maxRounds: z.number().int().min(1).max(50).optional(),
  aiPlayers: z.number().int().min(1).max(GAME_CONFIG.MAX_AI_PLAYERS_CUSTOM).optional(),
});

export const SessionSnapshotSchema = z.object({
  id: z.string().min(1),
  state: GameStateSchema,
  revision: z.number().int().min(1),
  // Multiplayer‑ready fields (present but optional in Phase 1)
  deadlineAt: z.string().datetime().nullable().optional(),
  submitted: z.record(z.boolean()).optional(),
});

export const PatchSessionRequestSchema = z.object({
  patch: z.object({
    maxRounds: z.number().int().min(1).max(50).optional(),
    aiPlayers: z.number().int().min(0).max(GAME_CONFIG.MAX_AI_PLAYERS_CUSTOM).optional(),
  }),
});

export const JoinSessionRequestSchema = z.object({ name: z.string().min(1) });
export const ActionOptionsRequestSchema = z.object({
  playerId: z.string().min(1),
  playerRoleName: z.string().min(1).optional(),
});
export const SubmitActionsRequestSchema = z.object({
  playerId: z.string().min(1),
  actions: z.array(ActionOptionSchema).min(0).max(10),
});
export const AdvanceRequestSchema = z.object({
  // Provide human context so the server can compute the round deterministically
  humanRoleName: z.string().min(1).optional(),
  humanPlayerId: z.string().min(1).optional(),
  humanActions: z.array(ActionOptionSchema).optional(),
  humanAvailableOptions: z.array(ActionOptionSchema).optional(),
});
export const DebriefRequestSchema = z.object({});

// Response envelopes for common endpoints
export const CreateSessionResponseSchema = ApiSuccessSchema(
  z.object({ id: z.string().min(1), revision: z.number().int().min(1), hostToken: z.string().min(1), state: GameStateSchema })
);
export const GetSessionResponseSchema = ApiSuccessSchema(SessionSnapshotSchema);
export const GenericOkSchema = ApiSuccessSchema(z.object({ ok: z.literal(true) }));

export type CreateSessionRequest = any;
export type SessionSnapshot = any;
