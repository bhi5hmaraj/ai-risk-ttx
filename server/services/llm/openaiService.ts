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
  getInitialScenarioChatPrompt,
  getChatConsequencesPrompt,
  getDebriefPrompt,
} from "../../../prompts";
import { GAME_CONFIG } from '../../../gameConfig';
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
const CauseZ = z.object({
  type: z.enum(['event', 'action', 'exogenous']),
  ref: z.string(),
  rationale: z.string(),
}).strict();
const SentimentZ = z.enum(['positive', 'negative', 'neutral', 'mixed']);
const TimelineItemZ = z.object({
  title: z.string(),
  description: z.string(),
  impact: z.string(),
  sentiment: SentimentZ,
  causes: z.array(CauseZ).optional(),
}).strict();
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
  }).strict()).min(5).max(1 + GAME_CONFIG.MAX_AI_PLAYERS_CUSTOM),
}).strict();

// Per OpenAI Structured Outputs guidelines, all fields must be required; use nullables for optional semantics
const DebriefEventZ = z.object({ round: z.number().int().min(1), title: z.string(), description: z.string(), impact: z.string(), actor: z.string().nullable(), causes: z.array(CauseZ).optional() }).strict();
const DebriefActionZ = z.object({ round: z.number().int().min(1), title: z.string(), impact: z.string(), rationale: z.string().nullable() }).strict();
// Allow as few as 1 event to avoid forcing hallucinated rounds in short games
const DebriefZ = z.object({ summary: z.string(), keyEvents: z.array(DebriefEventZ).min(1).max(7), userActions: z.array(DebriefActionZ).min(0) }).strict();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseWithZod<T>(schema: any, prompt: string, name: string): Promise<T | null> {
  const systemMessage = { role: "system" as const, content: "You are a helpful AI assistant that generates structured JSON responses for a crisis simulation game. Always respond with valid JSON matching the requested schema." };
  const userMessage = { role: "user" as const, content: prompt };

  try {
    const completion = await getClient().chat.completions.create({
      model,
      messages: [systemMessage, userMessage],
      response_format: zodResponseFormat(schema, name),
    });
    const msg = completion.choices[0]?.message as any;
    if (msg?.refusal) return null;
    if (msg?.parsed) return msg.parsed as T;
    const content = msg?.content;
    if (typeof content === "string") { const parsed = safeJsonParse<T>(content); if (parsed) return parsed; }
    throw new Error("No parsed content from structured output");
  } catch (e: any) {
    console.warn(`[parseWithZod] Structured output failed for ${name}:`, e?.message || e);
    // Fallback to json_object mode without structured output
    try {
      const res = await getClient().chat.completions.create({
        model,
        messages: [systemMessage, { role: "user" as const, content: `${prompt}\n\nRespond ONLY with valid JSON matching the described schema.` }],
        response_format: { type: "json_object" },
      });
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
  async generateCustomScenario(scenarioDescription, aiPlayers) {
    const { prompt } = getCustomScenarioPromptAndSchema(scenarioDescription, aiPlayers);
    return await parseWithZod<GameSetup>(GameSetupZ, prompt, "custom_scenario_setup");
  },
  async generateInitialScenarioChat(session: GameChatSession) {
    const prompt = getInitialScenarioChatPrompt();
    return await session.sendMessage<AIConsequenceResponse>(prompt, ConsequenceZ);
  },
  async generateConsequencesChat(session, gameState, players, counterfactualScoreChange, maxRounds?: number) {
    const prompt = getChatConsequencesPrompt(gameState, players, counterfactualScoreChange, maxRounds);

    return await session.sendMessage<AIConsequenceResponse>(prompt, ConsequenceZ);
  },
  async generateAITurn(player, gameState, previousRoundActions) {
    const { prompt } = getAITurnPromptAndSchema(player, gameState, previousRoundActions);
    return await parseWithZod(AITurnZ, prompt, `AI Turn for ${player.role.name}`);
  },
  async generateDebriefChat(session, gameState, players, humanRoleName, gameSetup) {
    const prompt = getDebriefPrompt(gameState, players, humanRoleName, gameSetup);
    return await parseWithZod<AIDebriefResponse>(DebriefZ, prompt, 'debrief');
  },
};
