import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import type { GameSetup, Player } from "../types/core";
import { GAME_CONFIG } from "../gameConfig";

const baseURL = process.env.LITELLM_BASE_URL || "https://asgard.bhishmaraj.org";
const apiKey = process.env.LITELLM_API_KEY;
const model = process.env.LLM_MODEL || "gpt-4o-mini";

if (!apiKey) {
  throw new Error("Missing LiteLLM configuration. Please set LITELLM_API_KEY environment variable.");
}

const client = new OpenAI({
  apiKey,
  baseURL,
});

/**
 * Represents a persistent chat session for a game.
 * Maintains conversation history and enables context caching.
 */
export class GameChatSession {
  private messages: ChatCompletionMessageParam[] = [];
  private gameSetup: GameSetup | null = null;
  private players: Player[] = [];

  constructor(systemPrompt: string, gameSetup?: GameSetup, players?: Player[]) {
    // System prompt is cached - contains all the game rules and context
    this.messages.push({
      role: "system",
      content: systemPrompt,
    });

    if (gameSetup) {
      this.gameSetup = gameSetup;
    }
    if (players) {
      this.players = players;
    }
  }

  /**
   * Send a message to the LLM and get a response, maintaining conversation history
   */
  async sendMessage<T extends Record<string, any>>(
    userMessage: string,
    responseSchema?: z.ZodSchema<T>
  ): Promise<T | null> {
    // Add user message to history
    this.messages.push({
      role: "user",
      content: userMessage,
    });

    try {
      const response = await client.chat.completions.create(
        responseSchema
          ? {
              model,
              messages: this.messages,
              response_format: zodResponseFormat(responseSchema, "response"),
            }
          : {
              model,
              messages: this.messages,
            }
      );

      const assistantMessage = response.choices[0]?.message as any;
      if (!assistantMessage) {
        throw new Error("No response from LLM");
      }

      // Add assistant response to history
      this.messages.push({
        role: "assistant",
        content: assistantMessage.content || "",
      });

      // Parse structured output if schema was provided
      if (responseSchema) {
        if (assistantMessage?.parsed) {
          return assistantMessage.parsed as T;
        }
        if (typeof assistantMessage.content === 'string' && assistantMessage.content.trim()) {
          try {
            return JSON.parse(assistantMessage.content) as T;
          } catch (error) {
            console.error("[ChatSession] Failed to parse JSON content:", error);
          }
        }
        // Final fallback: request json_object and parse
        try {
          const res2 = await client.chat.completions.create({
            model,
            messages: this.messages,
            response_format: { type: 'json_object' },
          });
          const text = (res2.choices[0]?.message?.content || '').trim();
          return text ? (JSON.parse(text) as T) : null;
        } catch (e2) {
          console.error('[ChatSession] Fallback json_object failed:', e2);
          return null;
        }
      }

      return { content: assistantMessage.content } as unknown as T;
    } catch (error) {
      console.error("Chat session error:", error);
      return null;
    }
  }

  /**
   * Get the full conversation history
   */
  getHistory(): ChatCompletionMessageParam[] {
    return [...this.messages];
  }

  /**
   * Get message count for debugging
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * Reset the session (keeping system prompt)
   */
  reset() {
    const systemPrompt = this.messages[0];
    this.messages = [systemPrompt];
  }
}

/**
 * Create a system prompt for the game master role.
 * This prompt is cached and persists throughout the game.
 */
export function createGameMasterSystemPrompt(gameSetup: GameSetup, players: Player[]): string {
  const rolesDescription = players.map(p =>
    `- ${p.role.name}: Public Goal: "${p.role.publicObjective}" | Hidden Goal: "${p.role.hiddenObjective}"`
  ).join("\n");

  return `You are the Game Master for "Simulacra", an AI-powered tabletop exercise simulation.

# YOUR ROLE
You are an impartial arbiter who:
- Narrates the unfolding crisis scenario
- Determines consequences of player actions
- Creates new events that escalate naturally from previous rounds
- Maintains narrative coherence and cause-and-effect continuity

# GAME SETUP
**Scenario:** ${gameSetup.scenarioTitle}
${gameSetup.scenarioDescription}

**Core Metric:** ${gameSetup.coreMetric.name} (${gameSetup.coreMetric.description})
Starting at: ${gameSetup.coreMetric.value}

**Stakeholders:**
${rolesDescription}

# GAME RULES
- Maximum ${GAME_CONFIG.MAX_ROUNDS} rounds
- Each player has ${GAME_CONFIG.ACTION_POINTS_PER_ROUND} action points per round
- Game ends if ${gameSetup.coreMetric.name} drops to 0 or below
- Players balance public objectives (visible) with hidden objectives (secret)

# CRITICAL NARRATIVE REQUIREMENTS
1. **Maintain Continuity:** Every event and consequence must flow logically from previous rounds
2. **Reference Specific Actions:** Always name which player did what (e.g., "The Tech CEO's decision to..." not "a decision was made")
3. **Show Cause and Effect:** Explicitly connect current events to past actions (e.g., "Following the Journalist's exposé in Round 2...")
4. **Create Escalation:** Each round should build on previous tensions and decisions
5. **Provide Timeline Beats:** Break down consequences into 3-5 chronological moments

# RESPONSE FORMAT
You will be asked to generate consequences for each round. Always provide:
- A round summary that references specific player actions
- A timeline of 3-5 key moments showing how events unfolded
- Score changes for both public and hidden objectives
- A new crisis event that emerges from previous actions

Remember: The players are experiencing a continuous story. Make sure each round feels connected to what came before.`;
}

/**
 * Factory function to create a new game chat session
 */
export function createGameSession(gameSetup: GameSetup, players: Player[]): GameChatSession {
  const systemPrompt = createGameMasterSystemPrompt(gameSetup, players);
  return new GameChatSession(systemPrompt, gameSetup, players);
}
