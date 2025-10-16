import { z } from 'zod';

// ============================================================================
// FEEDBACK FORM SCHEMA v1.0.0
// ============================================================================

export const FEEDBACK_SCHEMA_VERSION = '1.0.0' as const;

// Zod Schemas for Validation
// ============================================================================

export const ratingsSchema = z.object({
  ui: z.number().int().min(1).max(10),
  gameDynamics: z.number().int().min(1).max(10),
  modelQuality: z.number().int().min(1).max(10),
  scenario: z.number().int().min(1).max(10),
  actions: z.number().int().min(1).max(10),
  stakeholders: z.number().int().min(1).max(10),
});

export const gameMetadataSchema = z.object({
  model: z.string(),
  scenarioType: z.enum(['classic', 'ai_safety', 'custom']),
  rolePlayed: z.string(),
  roundsCompleted: z.number().int().min(0),
  finalPublicScore: z.number().nullable(),
  customPromptUsed: z.boolean(),
  customPrompt: z.string().optional(),
});

export const responsesSchema = z.object({
  scenarioUsefulness: z.string().optional(),
  counterfactualTime: z.string().optional(),
  improvements: z.string().optional(),
});

export const demographicsSchema = z.object({
  background: z.array(z.enum(['tech', 'policy', 'creative'])),
});

export const contactSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  wantsCollaboration: z.boolean(),
});

export const metaSchema = z.object({
  sessionId: z.string(),
  submittedAt: z.string().datetime(),
});

export const feedbackDataV1Schema = z.object({
  schemaVersion: z.literal('1.0.0'),
  ratings: ratingsSchema,
  gameMetadata: gameMetadataSchema,
  responses: responsesSchema,
  demographics: demographicsSchema,
  contact: contactSchema,
  meta: metaSchema,
});

// TypeScript Types
// ============================================================================

export type Ratings = z.infer<typeof ratingsSchema>;
export type GameMetadata = z.infer<typeof gameMetadataSchema>;
export type Responses = z.infer<typeof responsesSchema>;
export type Demographics = z.infer<typeof demographicsSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Meta = z.infer<typeof metaSchema>;

export type FeedbackDataV1 = z.infer<typeof feedbackDataV1Schema>;

// Union type for all schema versions (future-proof)
export type FeedbackData = FeedbackDataV1;

// ============================================================================
// FORM STATE (for React Hook Form)
// ============================================================================

/**
 * Form state type used by React Hook Form (before adding metadata)
 */
export interface FeedbackFormState {
  // Ratings
  uiRating: number;
  gameDynamicsRating: number;
  modelQualityRating: number;
  scenarioRating: number;
  actionsRating: number;
  stakeholdersRating: number;

  // Responses
  scenarioUsefulness?: string;
  counterfactualTime?: string;
  improvements?: string;

  // Demographics
  backgroundTech: boolean;
  backgroundPolicy: boolean;
  backgroundCreative: boolean;

  // Contact
  email?: string;
  wantsCollaboration: boolean;
}

/**
 * Transform form state into submission payload
 */
export function transformFormStateToFeedbackData(
  formState: FeedbackFormState,
  gameMetadata: GameMetadata,
  sessionId: string
): FeedbackDataV1 {
  const background: ('tech' | 'policy' | 'creative')[] = [];
  if (formState.backgroundTech) background.push('tech');
  if (formState.backgroundPolicy) background.push('policy');
  if (formState.backgroundCreative) background.push('creative');

  return {
    schemaVersion: FEEDBACK_SCHEMA_VERSION,
    ratings: {
      ui: formState.uiRating,
      gameDynamics: formState.gameDynamicsRating,
      modelQuality: formState.modelQualityRating,
      scenario: formState.scenarioRating,
      actions: formState.actionsRating,
      stakeholders: formState.stakeholdersRating,
    },
    gameMetadata,
    responses: {
      scenarioUsefulness: formState.scenarioUsefulness?.trim() || undefined,
      counterfactualTime: formState.counterfactualTime?.trim() || undefined,
      improvements: formState.improvements?.trim() || undefined,
    },
    demographics: {
      background,
    },
    contact: {
      email: formState.email?.trim() || undefined,
      wantsCollaboration: formState.wantsCollaboration,
    },
    meta: {
      sessionId,
      submittedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// DATABASE SUBMISSION PAYLOAD
// ============================================================================

/**
 * Payload sent to POST /api/feedback
 */
export interface FeedbackSubmissionPayload {
  data: FeedbackData;

  // Denormalized fields for indexing
  model: string;
  scenarioType: string;
  rolePlayed: string;
  gameCompleted: boolean;
  avgRating: number;
}

/**
 * Create submission payload from feedback data
 */
export function createFeedbackSubmission(
  data: FeedbackData
): FeedbackSubmissionPayload {
  const ratings = Object.values(data.ratings);
  const avgRating = ratings.reduce((sum, val) => sum + val, 0) / ratings.length;

  return {
    data,
    model: data.gameMetadata.model,
    scenarioType: data.gameMetadata.scenarioType,
    rolePlayed: data.gameMetadata.rolePlayed,
    gameCompleted: data.gameMetadata.finalPublicScore !== null,
    avgRating: Math.round(avgRating * 100) / 100, // Round to 2 decimals
  };
}

// ============================================================================
// FORM REGISTRY (for versioning)
// ============================================================================

/**
 * Registry of form versions
 * Add new versions here as they're created
 */
export const FEEDBACK_FORM_VERSIONS = {
  '1.0.0': {
    schema: feedbackDataV1Schema,
    current: true,
  },
} as const;

export const CURRENT_FORM_VERSION = '1.0.0';
