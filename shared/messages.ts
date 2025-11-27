import { z, type infer as ZodInfer } from 'zod';

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

// --- Inferred Types (Codegen) ---

export type SetRoleMessage = ZodInfer<typeof SetRoleSchema>;
export type SubmitActionMessage = ZodInfer<typeof SubmitActionSchema>;
export type StartGameMessage = ZodInfer<typeof StartGameSchema>;
export type AdvanceRoundMessage = ZodInfer<typeof AdvanceRoundSchema>;
