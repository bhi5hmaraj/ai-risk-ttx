import { z, type ZodTypeAny, ZodObject, ZodArray, ZodString, ZodNumber, ZodBoolean, ZodRecord, ZodUnion, ZodLiteral } from 'zod';
import type { Parameter } from '@copilotkit/shared';
import type { GameSetup } from '@/server/types/core';

// Single source of truth for the Custom Scenario Builder form.
// - zod schema for validation
// - default values
// - helpers to compile to prompt string and to GameSetup
// - JSON schema for Copilot actions

export const zCoreMetric = z.object({
  name: z.string().min(3, 'Core metric name is required'),
  description: z.string().min(5, 'Core metric description is required'),
  value: z.number().min(70).max(100),
});

// Field order tuned for cleaner UI rendering
export const zStakeholder = z.object({
  name: z.string().trim().optional(),
  character: z.string().trim().optional(),
  hiddenObjective: z.string().trim().optional(),
  icon: z.string().trim().optional(),
});

export const zCustomScenarioForm = z.object({
  scenarioTitle: z.string().min(3, 'Title is required'),
  scenarioDescription: z.string().min(10, 'Description is required'),
  coreMetric: zCoreMetric,
  stakeholders: z.array(zStakeholder).min(0).max(6),
  maxRounds: z.union([z.number().int().min(3).max(10), z.literal('')]).optional().default(''),
  comments: z.record(z.string()).optional().default({}),
});

export type CustomScenarioForm = any;
export type StakeholderForm = any;

export function createDefaultForm(): CustomScenarioForm {
  const empty: StakeholderForm = { name: '', icon: '', hiddenObjective: '', character: '' };
  return {
    scenarioTitle: '',
    scenarioDescription: '',
    coreMetric: { name: '', description: '', value: 100 },
    stakeholders: [empty, empty, empty, empty],
    maxRounds: '',
    comments: {},
  };
}

export function compileToPrompt(form: CustomScenarioForm): string {
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const coerced = {
    ...form,
    coreMetric: {
      name: form.coreMetric?.name || '',
      description: form.coreMetric?.description || '',
      value: clamp(Number((form.coreMetric as any)?.value) || 100, 70, 100),
    },
  } as CustomScenarioForm;

  // Best‑effort: use validated data if available, otherwise fall back to coerced
  const parsed = zCustomScenarioForm.safeParse(coerced);
  const f = (parsed.success ? parsed.data : coerced) as CustomScenarioForm;

  const roles = (f.stakeholders || [])
    .filter((s: any) => (s?.name || s?.hiddenObjective || s?.character))
    .map((s: any) => `- ${s?.name || 'Unknown'} (${s?.icon || '🧩'}): character="${s?.character || ''}", hidden="${s?.hiddenObjective || ''}"`)
    .join('\n');

  const lines: (string | null)[] = [];
  if ((f.scenarioTitle || '').trim()) lines.push(`Title: ${f.scenarioTitle}`);
  if ((f.scenarioDescription || '').trim()) lines.push(`Overview: ${f.scenarioDescription}`);
  const hasCore = (f.coreMetric?.name || '').trim() || (f.coreMetric?.description || '').trim();
  if (hasCore) {
    const name = f.coreMetric?.name || 'Core Metric';
    const desc = f.coreMetric?.description || '';
    lines.push(`Core Metric: ${name}${desc ? ` — ${desc}` : ''} (start ${f.coreMetric?.value ?? 100})`);
  }
  if (roles) lines.push(`Stakeholders:\n${roles}`);
  if (typeof f.maxRounds === 'number') lines.push(`Max Rounds: ${f.maxRounds}`);

  return lines.filter(Boolean).join('\n');
}

export function toGameSetup(form: CustomScenarioForm): GameSetup {
  const v = zCustomScenarioForm.parse({ ...form, coreMetric: { ...form.coreMetric, value: Number(form.coreMetric.value) } });
  const stakeholders = (v.stakeholders || []).map((s: any) => ({
    name: s.name || '',
    icon: s.icon || '🧩',
    publicObjective: '', // kept for schema compatibility
    hiddenObjective: s.hiddenObjective || '',
    resources: [],
    constraints: [],
  }));
  return {
    scenarioTitle: v.scenarioTitle,
    scenarioDescription: v.scenarioDescription,
    coreMetric: v.coreMetric,
    stakeholders,
    maxRounds: typeof v.maxRounds === 'number' ? v.maxRounds : null,
    maxAIPlayers: null,
  };
}

// JSON schema to register Copilot actions with a single source of truth.
// Keep this in sync with zod schema above.
// Helper: derive CopilotKit Parameter[] from the Zod schema above.
// Keeps a single source of truth for both validation and the copilot tool schema.
function zodToParameter(name: string, schema: any): Parameter | null {
  // unwrap common wrappers
  const unwrap = (t: any): any => {
    let cur = t as any;
    while (cur && (cur._def?.innerType || cur._def?.schema)) {
      cur = (cur._def.innerType || cur._def.schema);
    }
    return cur as any;
  };
  const s = unwrap(schema);
  if (s instanceof (z as any).ZodString) return { name, type: 'string' };
  if (s instanceof (z as any).ZodNumber) return { name, type: 'number' };
  if (s instanceof (z as any).ZodBoolean) return { name, type: 'boolean' };
  if (s instanceof (z as any).ZodRecord) return { name, type: 'object' };
  if (s instanceof (z as any).ZodArray) {
    const el = (s as any)._def.type;
    const e = unwrap(el);
    if (e instanceof (z as any).ZodObject) {
      return {
        name,
        type: 'object[]',
        attributes: Object.entries((e as any).shape).map(([k, v]) => zodToParameter(k, v as any)!).filter(Boolean) as Parameter[],
      } as any;
    }
    if (e instanceof (z as any).ZodString) return { name, type: 'string[]' } as any;
    if (e instanceof (z as any).ZodNumber) return { name, type: 'number[]' } as any;
    if (e instanceof (z as any).ZodBoolean) return { name, type: 'boolean[]' } as any;
    return { name, type: 'object[]' } as any;
  }
  if (s instanceof (z as any).ZodObject) {
    const attrs = Object.entries((s as any).shape).map(([k, v]) => zodToParameter(k, v as any)!).filter(Boolean) as Parameter[];
    return { name, type: 'object', attributes: attrs } as any;
  }
  if (s instanceof (z as any).ZodUnion) {
    // best-effort: pick the first non-literal branch
    const options = (s as any)._def?.options || [];
    const nonLiteral = options.find((o: any) => !(o instanceof (z as any).ZodLiteral));
    const chosen = zodToParameter(name, nonLiteral || options[0]);
    return chosen || { name, type: 'string' } as any;
  }
  // Fallback
  return { name, type: 'object' } as any;
}

export function zodToCopilotParameters(objectSchema: any): Parameter[] {
  const shape = (objectSchema as any).shape || {};
  return Object.entries(shape).map(([k, v]) => zodToParameter(k, v as any)!).filter(Boolean) as Parameter[];
}

export const copilotParameters: Parameter[] = zodToCopilotParameters(zCustomScenarioForm);

// Minimal JSON schema derivation from the same Zod schema, for prompts.
// Intentionally lossy: we only encode field shapes, not validations.
type JSONSchema = { type: string; properties?: Record<string, any>; items?: any };
function zodToMinimalJsonSchema(s: any): JSONSchema {
  const unwrap = (t: any): any => {
    let cur = t as any;
    while (cur && (cur._def?.innerType || cur._def?.schema)) {
      cur = (cur._def.innerType || cur._def.schema);
    }
    return cur as any;
  };
  const u = unwrap(s);
  if (u instanceof (z as any).ZodString) return { type: 'string' };
  if (u instanceof (z as any).ZodNumber) return { type: 'number' };
  if (u instanceof (z as any).ZodBoolean) return { type: 'boolean' };
  if (u instanceof (z as any).ZodArray) return { type: 'array', items: zodToMinimalJsonSchema((u as any)._def.type) };
  if (u instanceof (z as any).ZodObject) {
    const props: Record<string, any> = {};
    for (const [k, v] of Object.entries((u as any).shape)) {
      props[k] = zodToMinimalJsonSchema(v as any);
    }
    return { type: 'object', properties: props };
  }
  if (u instanceof (z as any).ZodUnion) {
    // Represent union as the first branch shape to keep schema simple
    const first = (u as any)._def?.options?.[0];
    return first ? zodToMinimalJsonSchema(first) : { type: 'string' };
  }
  return { type: 'object' };
}

export const minimalCustomScenarioJsonSchema: JSONSchema = {
  type: 'object',
  properties: Object.fromEntries(
    Object.entries(zCustomScenarioForm.shape).map(([k, v]) => [k, zodToMinimalJsonSchema(v as any)])
  ),
};
