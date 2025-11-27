import { z } from 'zod';

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
