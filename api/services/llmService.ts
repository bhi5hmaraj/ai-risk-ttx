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
} from "../../types";
import { RoleName } from "../../types";
import {
  getInitialScenarioPromptAndSchema,
  getConsequencesPromptAndSchema,
  getAIPlayerActionsPromptAndSchema,
  getActionOptionsPromptAndSchema,
  getCounterfactualPromptAndSchema,
  getCustomScenarioPromptAndSchema,
  getAITurnPromptAndSchema,
} from "../../prompts";

// Server-side LiteLLM configuration
const baseURL = process.env.LITELLM_BASE_URL || "https://asgard.bhishmaraj.org";
const apiKey = process.env.LITELLM_API_KEY;
const model = process.env.LLM_MODEL || "gpt-4o-mini";

if (!apiKey) {
  throw new Error(
    "Missing LiteLLM configuration. Please set LITELLM_API_KEY environment variable."
  );
}

const client = new OpenAI({
  apiKey,
  baseURL,
});

const safeJsonParse = <T,>(jsonString: string): T | null => {
  try {
    let cleanString = jsonString.trim();
    const fenceRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
    const match = cleanString.match(fenceRegex);
    if (match && match[1]) {
      cleanString = match[1].trim();
    }
    return JSON.parse(cleanString);
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    console.error("Original string:", jsonString);
    return null;
  }
};

// Zod schemas for structured outputs
const HiddenUpdateZ = z.object({
  roleName: z.string(),
  update: z.number(),
  justification: z.string(),
}).strict();

const GameEventZ = z.object({
  headline: z.string(),
  detail: z.string(),
}).strict();

const TimelineItemZ = z.object({
  title: z.string(),
  description: z.string(),
  impact: z.string(),
}).strict();

const ConsequenceZ = z.object({
  roundSummary: z.string(),
  outcomeTimeline: z.array(TimelineItemZ).min(3).max(5),
  counterfactualNote: z.string(),
  publicScoreUpdate: z.number(),
  hiddenScoreUpdates: z.array(HiddenUpdateZ),
  nextEvent: GameEventZ,
}).strict();

const ActionOptionZ = z.object({
  title: z.string(),
  description: z.string(),
  cost: z.number(),
}).strict();

const AIPlayerActionsZ = z.object({
  actions: z.array(ActionOptionZ),
}).strict();

const ActionOptionsResponseZ = z.object({
  options: z.array(ActionOptionZ).length(5),
}).strict();

const CounterfactualZ = z.object({
  publicScoreUpdate: z.number(),
}).strict();

const AITurnZ = z.object({
  options: z.array(ActionOptionZ).length(5),
  chosenActions: z.array(ActionOptionZ),
  reasoning: z.string(),
}).strict();

const GameSetupZ = z.object({
    scenarioTitle: z.string(),
    scenarioDescription: z.string(),
    coreMetric: z.object({
        name: z.string(),
        description: z.string(),
        initialValue: z.number(),
    }).strict(),
    stakeholders: z.array(z.object({
        name: z.string(),
        icon: z.string(),
        publicObjective: z.string(),
        hiddenObjective: z.string(),
        resources: z.array(z.string()).optional(),
        constraints: z.array(z.string()).optional(),
    }).strict()).min(4).max(6),
}).strict();

async function parseWithZod<T>(schema: z.ZodSchema<T>, prompt: string, name: string): Promise<T | null> {
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: zodResponseFormat(schema, name),
    });
    const msg = completion.choices[0]?.message as any;
    if (msg?.refusal) {
      console.error("Model refusal:", msg.refusal);
      return null;
    }
    if (msg?.parsed) {
      return msg.parsed as T;
    }
    const content = msg?.content;
    if (typeof content === "string") {
      const parsed = safeJsonParse<T>(content);
      if (parsed) return parsed;
    }
    // Fall back to json_object if parsing or enforcement failed
    throw new Error("No parsed content from structured output");
  } catch (e) {
    console.warn("Structured output enforcement failed, falling back to json_object:", e);
    try {
      const res = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: `${prompt}\n\nRespond ONLY with valid JSON matching the described schema.` }],
        response_format: { type: "json_object" },
      });
      const text = (res.choices[0]?.message?.content || "").trim();
      return safeJsonParse<T>(text);
    } catch (e2) {
      console.error("Fallback json_object also failed:", e2);
      return null;
    }
  }
}

export const generateInitialScenario = async (): Promise<AIConsequenceResponse | null> => {
  console.log("[LLM] Calling generateInitialScenario...");
  const { prompt } = getInitialScenarioPromptAndSchema();
  try {
    return await parseWithZod<AIConsequenceResponse>(ConsequenceZ, prompt, "initial_scenario");
  } catch (error) {
    console.error("Error generating initial scenario:", error);
    return null;
  }
};

export const generateConsequences = async (
  gameState: GameState,
  players: Player[],
  counterfactualScoreChange: number
): Promise<AIConsequenceResponse | null> => {
  console.log(`[LLM] Calling generateConsequences for round ${gameState.round}...`);
  const { prompt } = getConsequencesPromptAndSchema(
    gameState,
    players,
    counterfactualScoreChange
  );
  try {
    return await parseWithZod<AIConsequenceResponse>(ConsequenceZ, prompt, "round_consequences");
  } catch (error) {
    console.error("Error generating consequences:", error);
    return null;
  }
};

export const generateAIPlayerActions = async (
  player: Player,
  gameState: GameState,
  options: ActionOption[]
): Promise<ActionOption[] | null> => {
  console.log(
    `[LLM] Calling generateAIPlayerActions for ${player.role.name} in round ${gameState.round}...`
  );
  const { prompt } = getAIPlayerActionsPromptAndSchema(player, gameState, options);
  try {
    const parsed = await parseWithZod<{ actions: ActionOption[] }>(AIPlayerActionsZ, prompt, "ai_player_actions");
    return parsed ? parsed.actions : [];
  } catch (error) {
    console.error(`Error generating actions for AI player ${player.role.name}:`, error);
    return null;
  }
};

export const generateActionOptions = async (
  player: Player,
  gameState: GameState,
  previousRoundActions: PlayerRoundActions[] | null
): Promise<AIActionOptionsResponse | null> => {
  console.log(
    `[LLM] Calling generateActionOptions for ${player.role.name} in round ${gameState.round}...`
  );
  const { prompt } = getActionOptionsPromptAndSchema(
    player,
    gameState,
    previousRoundActions
  );
  try {
    return await parseWithZod<AIActionOptionsResponse>(
      ActionOptionsResponseZ,
      prompt,
      "action_options"
    );
  } catch (error) {
    console.error("Error generating action options:", error);
    return null;
  }
};

export const generateCounterfactualConsequences = async (
  gameState: GameState
): Promise<AICounterfactualResponse | null> => {
  console.log(
    `[LLM] Calling generateCounterfactualConsequences for round ${gameState.round}...`
  );
  const { prompt } = getCounterfactualPromptAndSchema(gameState);
  try {
    return await parseWithZod<AICounterfactualResponse>(CounterfactualZ, prompt, "counterfactual");
  } catch (error) {
    console.error("Error generating counterfactual consequences:", error);
    return null;
  }
};

export const generateCustomScenario = async (scenarioDescription: string): Promise<GameSetup | null> => {
    console.log("[LLM] Calling generateCustomScenario...");
    const { prompt } = getCustomScenarioPromptAndSchema(scenarioDescription);
    try {
        return await parseWithZod<GameSetup>(GameSetupZ, prompt, "custom_scenario_setup");
    } catch (error) {
        console.error("Error generating custom scenario:", error);
        return null;
    }
};

/**
 * CHAT MODE FUNCTIONS
 * These functions use the chat session for better context and caching
 */

import type { GameChatSession } from './chatSession';

/**
 * Generate initial scenario using chat session
 */
export const generateInitialScenarioChat = async (
  session: GameChatSession
): Promise<AIConsequenceResponse | null> => {
  console.log("[LLM Chat] Generating initial scenario...");

  const prompt = `Begin the simulation by generating the opening crisis scenario.

You must provide:
1. **roundSummary**: 2-3 sentence overview of the starting crisis
2. **outcomeTimeline**: 3-4 key moments that set the stage (chronological beats)
3. **counterfactualNote**: Start with "If no one acts..." and explain the baseline deterioration
4. **publicScoreUpdate**: A negative score change (-15 to -25) representing the initial crisis impact
5. **hiddenScoreUpdates**: All players start with update: 0, justification: "Game start."
6. **nextEvent**: The first actionable crisis the players will face

This is Round 0 - the setup round. Make it tense and engaging.`;

  try {
    return await session.sendMessage<AIConsequenceResponse>(prompt, ConsequenceZ);
  } catch (error) {
    console.error("Error in generateInitialScenarioChat:", error);
    return null;
  }
};

/**
 * Generate consequences for a round using chat session
 * The chat history naturally maintains context from previous rounds
 */
export const generateConsequencesChat = async (
  session: GameChatSession,
  gameState: GameState,
  players: Player[],
  counterfactualScoreChange: number
): Promise<AIConsequenceResponse | null> => {
  console.log(`[LLM Chat] Generating consequences for round ${gameState.round}...`);

  const playerActionsText = players.map(p => {
    const actionTitles = p.actions.length > 0
      ? p.actions.map(a => `"${a.title}"`).join(", ")
      : 'took no action';
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
If no one had acted, the ${gameState.coreMetric.name} would have changed by **${counterfactualScoreChange}** points.

## Your Task
Generate the consequences of these actions. Remember to:

1. **Round Summary**: Explicitly name which players did what and how it affected the situation (e.g., "The Tech CEO's rushed deployment, combined with the Journalist's exposé...")

2. **Outcome Timeline** (3-5 beats): Show the chronological sequence of events, directly referencing specific player actions

3. **Counterfactual Note**: Start with "If no one had acted..." and reference the ${counterfactualScoreChange} point change

4. **Public Score Update**: Determine the actual score change based on player actions

5. **Hidden Score Updates**: For each player, explain how their actions advanced or hindered their secret objective

6. **Next Event**: Create a new crisis that is a **direct result** of what just happened. Reference specific actions from this round in the event description.

CRITICAL: Show clear cause-and-effect. Every consequence must trace back to specific actions taken.`;

  try {
    return await session.sendMessage<AIConsequenceResponse>(prompt, ConsequenceZ);
  } catch (error) {
    console.error("Error in generateConsequencesChat:", error);
    return null;
  }
};

/**
 * OPTIMIZED: Generate AI turn (options + chosen actions) in one LLM call
 * This replaces calling generateActionOptions + generateAIPlayerActions separately
 * Reduces LLM calls by 50% for AI players
 */
export const generateAITurn = async (
  player: Player,
  gameState: GameState,
  previousRoundActions: PlayerRoundActions[] | null
): Promise<AITurnResponse | null> => {
  console.log(`[LLM] Generating AI turn for ${player.role.name}...`);

  const { prompt, schema } = getAITurnPromptAndSchema(player, gameState, previousRoundActions);

  return await parseWithZod(AITurnZ, prompt, `AI Turn for ${player.role.name}`);
};
