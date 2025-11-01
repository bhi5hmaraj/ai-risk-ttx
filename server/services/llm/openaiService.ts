import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import type {
  GameState,
  Player,
  AIConsequenceResponse,
  ActionOption,
  AIActionOptionsResponse,
  AICounterfactualResponse,
  AITurnResponse,
  PlayerRoundActions,
  GameSetup,
} from "../../types/core";
import type { AIDebriefResponse } from "../../types/core";
import {
  getInitialScenarioPromptAndSchema,
  getConsequencesPromptAndSchema,
  getAIPlayerActionsPromptAndSchema,
  getActionOptionsPromptAndSchema,
  getCounterfactualPromptAndSchema,
  getCustomScenarioPromptAndSchema,
  getAITurnPromptAndSchema,
} from "../../../prompts";
import type { LLMService } from './types';
import type { GameChatSession } from '../chatSession';

const baseURL = process.env.LITELLM_BASE_URL || 'https://asgard.bhishmaraj.org';
const apiKey = process.env.LITELLM_API_KEY;
const model = process.env.LLM_MODEL || 'gpt-4o-mini';
const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '10000', 10);

declare global {
  // eslint-disable-next-line no-var
  var __LLM_CLIENT__: InstanceType<typeof OpenAI> | undefined;
  // eslint-disable-next-line no-var
  var __LLM_SIG__: string | undefined;
}

const configSig = `${baseURL}|${model}|${timeoutMs}|${apiKey ? apiKey.slice(-4) : 'nokey'}`;

function getClient(): InstanceType<typeof OpenAI> {
  if (!apiKey) throw new Error("Missing LiteLLM configuration. Please set LITELLM_API_KEY environment variable.");
  if (!globalThis.__LLM_CLIENT__ || globalThis.__LLM_SIG__ !== configSig) {
    globalThis.__LLM_CLIENT__ = new OpenAI({ apiKey, baseURL, timeout: timeoutMs, maxRetries: 1 });
    globalThis.__LLM_SIG__ = configSig;
    try { console.log('[LLM INIT]', { baseURL, model, apiKeyPresent: !!apiKey, timeoutMs }); } catch {}
  }
  return globalThis.__LLM_CLIENT__;
}

const safeJsonParse = <T,>(jsonString: string): T | null => {
  try {
    let cleanString = jsonString.trim();
    const fenceRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
    const match = cleanString.match(fenceRegex);
    if (match && match[1]) cleanString = match[1].trim();
    return JSON.parse(cleanString);
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    console.error("Original string:", jsonString);
    return null;
  }
};

const HiddenUpdateZ = z.object({ roleName: z.string(), update: z.number(), justification: z.string() }).strict();
const GameEventZ = z.object({ headline: z.string(), detail: z.string() }).strict();
const TimelineItemZ = z.object({ title: z.string(), description: z.string(), impact: z.string() }).strict();
const ConsequenceZ = z.object({
  roundSummary: z.string(),
  outcomeTimeline: z.array(TimelineItemZ).min(3).max(5),
  counterfactualNote: z.string(),
  publicScoreUpdate: z.number(),
  hiddenScoreUpdates: z.array(HiddenUpdateZ),
  nextEvent: GameEventZ,
}).strict();
const ActionOptionZ = z.object({ title: z.string(), description: z.string(), cost: z.number() }).strict();
const AIPlayerActionsZ = z.object({ actions: z.array(ActionOptionZ) }).strict();
const ActionOptionsResponseZ = z.object({ options: z.array(ActionOptionZ).length(5) }).strict();
const CounterfactualZ = z.object({ publicScoreUpdate: z.number() }).strict();
const AITurnZ = z.object({ options: z.array(ActionOptionZ).length(5), chosenActions: z.array(ActionOptionZ), reasoning: z.string() }).strict();
const GameSetupZ = z.object({
  scenarioTitle: z.string(),
  scenarioDescription: z.string(),
  coreMetric: z.object({ name: z.string(), description: z.string(), value: z.number() }).strict(),
  stakeholders: z.array(z.object({
    name: z.string(), icon: z.string(), publicObjective: z.string(), hiddenObjective: z.string(),
    resources: z.array(z.string()).nullable(),
    constraints: z.array(z.string()).nullable(),
  }).strict()).min(4).max(6),
}).strict();

const DebriefEventZ = z.object({ round: z.number().int().min(1), title: z.string(), description: z.string(), impact: z.string() }).strict();
const DebriefActionZ = z.object({ round: z.number().int().min(1), title: z.string(), impact: z.string(), rationale: z.string().optional() }).strict();
const DebriefZ = z.object({ summary: z.string(), keyEvents: z.array(DebriefEventZ).min(3).max(7), userActions: z.array(DebriefActionZ).min(1) }).strict();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseWithZod<T>(schema: any, prompt: string, name: string): Promise<T | null> {
  try {
    const completion = await getClient().chat.completions.create({ model, messages: [{ role: "user", content: prompt }], response_format: zodResponseFormat(schema, name) });
    const msg = completion.choices[0]?.message as any;
    if (msg?.refusal) return null;
    if (msg?.parsed) return msg.parsed as T;
    const content = msg?.content;
    if (typeof content === "string") { const parsed = safeJsonParse<T>(content); if (parsed) return parsed; }
    throw new Error("No parsed content from structured output");
  } catch (e) {
    try {
      const res = await getClient().chat.completions.create({ model, messages: [{ role: "user", content: `${prompt}\n\nRespond ONLY with valid JSON matching the described schema.` }], response_format: { type: "json_object" } });
      const text = (res.choices[0]?.message?.content || "").trim();
      return safeJsonParse<T>(text);
    } catch (e2) {
      console.error("[parseWithZod] Fallback failed:", e2);
      return null;
    }
  }
}

export const LLM_OPENAI: LLMService = {
  async generateInitialScenario() {
    const { prompt } = getInitialScenarioPromptAndSchema();
    return await parseWithZod<AIConsequenceResponse>(ConsequenceZ, prompt, "initial_scenario");
  },
  async generateConsequences(gameState, players, counterfactualScoreChange) {
    const { prompt } = getConsequencesPromptAndSchema(gameState, players, counterfactualScoreChange);
    return await parseWithZod<AIConsequenceResponse>(ConsequenceZ, prompt, "round_consequences");
  },
  async generateAIPlayerActions(player, gameState, options) {
    const { prompt } = getAIPlayerActionsPromptAndSchema(player, gameState, options);
    const parsed = await parseWithZod<{ actions: ActionOption[] }>(AIPlayerActionsZ, prompt, "ai_player_actions");
    return parsed ? parsed.actions : [];
  },
  async generateActionOptions(player, gameState, previousRoundActions) {
    const { prompt } = getActionOptionsPromptAndSchema(player, gameState, previousRoundActions);
    return await parseWithZod<AIActionOptionsResponse>(ActionOptionsResponseZ, prompt, "action_options");
  },
  async generateCounterfactualConsequences(gameState) {
    const { prompt } = getCounterfactualPromptAndSchema(gameState);
    return await parseWithZod<AICounterfactualResponse>(CounterfactualZ, prompt, "counterfactual");
  },
  async generateCustomScenario(scenarioDescription) {
    const { prompt } = getCustomScenarioPromptAndSchema(scenarioDescription);
    return await parseWithZod<GameSetup>(GameSetupZ, prompt, "custom_scenario_setup");
  },
  async generateInitialScenarioChat(session: GameChatSession) {
    const prompt = `Begin the simulation by generating the opening crisis scenario.

You must provide:
1. **roundSummary**: 2-3 sentence overview of the starting crisis
2. **outcomeTimeline**: 3-4 key moments that set the stage (chronological beats)
3. **counterfactualNote**: Start with "If no one acts..." and explain the baseline deterioration
4. **publicScoreUpdate**: A negative score change (-15 to -25) representing the initial crisis impact
5. **hiddenScoreUpdates**: All players start with update: 0, justification: "Game start."
6. **nextEvent**: The first actionable crisis the players will face`;
    return await session.sendMessage<AIConsequenceResponse>(prompt, ConsequenceZ);
  },
  async generateConsequencesChat(session, gameState, players, counterfactualScoreChange) {
    const playerActionsText = players.map(p => {
      const actionTitles = p.actions.length > 0 ? p.actions.map(a => `"${a.title}"`).join(", ") : 'took no action';
      return `- **${p.role.name}**: ${actionTitles}`;
    }).join("\n");

    const prompt = `# Round ${gameState.round} - Determine Consequences

## Current Status
- **${gameState.coreMetric.name}**: ${gameState.coreMetric.value}
- **Crisis**: "${gameState.currentEvent?.headline}"
${gameState.currentEvent?.detail}

## Player Actions This Round
${playerActionsText}

## Counterfactual Analysis
If no one had acted, the ${gameState.coreMetric.name} would have changed by **${counterfactualScoreChange}** points.`;

    return await session.sendMessage<AIConsequenceResponse>(prompt, ConsequenceZ);
  },
  async generateAITurn(player, gameState, previousRoundActions) {
    const { prompt } = getAITurnPromptAndSchema(player, gameState, previousRoundActions);
    return await parseWithZod(AITurnZ, prompt, `AI Turn for ${player.role.name}`);
  },
  async generateDebriefChat(session, gameState, players, humanRoleName) {
    const human = humanRoleName || players.find(p => p.isHuman)?.role.name || 'Human Player';
    const last = gameState.eventLog.at(-1);
    const outcome = `${gameState.coreMetric.name}: ${gameState.coreMetric.value}`;
    const actionsText = players.map(p => `- ${p.role.name}: ${p.actions.map(a => a.title).join(', ') || 'no actions'}`).join('\n');
    const rounds = gameState.eventLog.map(e => `Round ${e.round}: ${e.event?.headline || 'N/A'} (Δ ${e.publicScoreChange})`).join('\n');

    const prompt = `You are debriefing the just-completed Simulacra simulation. Provide a structured debrief.

Final Outcome: ${outcome}

Round Headlines:
${rounds}

Player Actions Across Rounds:
${actionsText}

Focus especially on the human player's (${human}) actions and which ones most influenced the final outcome. Use the schema to respond.`;
    return await parseWithZod<AIDebriefResponse>(DebriefZ, prompt, 'debrief');
  },
};
