import { z } from 'zod';
import {
  ALL_POLICY_DIMENSIONS,
  POLICY_DIMENSION_MAP,
  updatePolicyStance,
  createDefaultPolicy,
  type PolicyDimensionConfig
} from './policy';
import type { Intent } from '../server/types/core';

// Re-export policy utilities for CLI access
export { ALL_POLICY_DIMENSIONS, POLICY_DIMENSION_MAP, updatePolicyStance, createDefaultPolicy };
export type { PolicyDimensionConfig };

// Re-export intent types for CLI access (CP5)
export type { Intent };

// --- Message Schemas ---

export const SetRoleSchema = z.object({
    role: z.string().min(1),
    name: z.string().optional(),
});

export const SubmitActionSchema = z.object({
    actionId: z.string(),
    cost: z.number().min(0),
});

export const StartGameSchema = z.object({});

export const AdvanceRoundSchema = z.object({});

// CP4: Update Policy Schema
// Validates policy stance updates with dimension keys and numeric values
// Client sends partial updates (only dimensions they want to change)
// Centralized: uses ALL_POLICY_DIMENSIONS from core types
const policyDimensionKeys = ALL_POLICY_DIMENSIONS.map(d => d.key) as [string, ...string[]];

export const UpdatePolicySchema = z.object({
    stances: z.record(
        z.enum(policyDimensionKeys),
        z.object({
            value: z.number().min(-100).max(100),
            description: z.string().optional(), // Optional: keep existing if not provided
        })
    ),
});

// --- Inferred Types (Manual - z.infer doesn't work in shared files) ---

export type SetRoleMessage = {
    role: string;
    name?: string;
};

export type SubmitActionMessage = {
    actionId: string;
    cost: number;
};

export type StartGameMessage = Record<string, never>;

export type AdvanceRoundMessage = Record<string, never>;

export type UpdatePolicyMessage = {
    stances: Record<string, {
        value: number;
        description?: string;
    }>;
};

// CP5: Intents Available Schema
// Server broadcasts intents alongside action_options
export const IntentsAvailableSchema = z.object({
    intents: z.array(z.object({
        id: z.string(),
        source: z.string(),
        target: z.string(),
        cost: z.number().min(1).max(3),
        deltas: z.object({
            targetResources: z.object({
                material: z.number().optional(),
                institutional: z.number().optional(),
                narrative: z.number().optional(),
            }).optional(),
            sourceResources: z.object({
                material: z.number().optional(),
                institutional: z.number().optional(),
                narrative: z.number().optional(),
            }).optional(),
            coreMetric: z.number().optional(),
        }),
        title: z.string(),
        description: z.string(),
        risk: z.enum(['low', 'medium', 'high']),
    })),
});

export type IntentsAvailableMessage = {
    intents: Intent[];
};
