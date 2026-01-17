import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { GameSetup, Player } from "../types/core";
import { GAME_CONFIG } from "../../gameConfig";

function getRuntimeConfig(): { baseURL: string; apiKey?: string; model: string; sig: string } {
  const baseURL = process.env.LITELLM_BASE_URL || "https://asgard.bhishmaraj.org";
  const apiKey = process.env.LITELLM_API_KEY;
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const apiKeySig = apiKey ? String(apiKey).slice(-4) : "nokey";
  const sig = `${baseURL}|${apiKeySig}`;
  return { baseURL, apiKey, model, sig };
}

let __client: any | null | undefined;
let __sig: string | undefined;
function getClient(): any {
  const { baseURL, apiKey, sig } = getRuntimeConfig();
  if (!__client) {
    if (!apiKey) {
      throw new Error("Missing LiteLLM configuration. Please set LITELLM_API_KEY environment variable.");
    }
    __client = new OpenAI({ apiKey, baseURL });
    __sig = sig;
  } else if (__sig !== sig) {
    if (!apiKey) {
      throw new Error("Missing LiteLLM configuration. Please set LITELLM_API_KEY environment variable.");
    }
    __client = new OpenAI({ apiKey, baseURL });
    __sig = sig;
  }
  return __client;
}

export class GameChatSession {
  private messages: Array<{ role: string; content: string }> = [];

  constructor(systemPrompt: string, _gameSetup?: GameSetup, _players?: Player[]) {
    this.messages.push({ role: "system", content: systemPrompt });
    // Note: _gameSetup and _players are unused but kept for API compatibility
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendMessage<T extends Record<string, any>>(
    userMessage: string,
    responseSchema?: any
  ): Promise<T | null> {
    this.messages.push({ role: "user", content: userMessage });
    try {
      const { model } = getRuntimeConfig();
      const response = await getClient().chat.completions.create(
        responseSchema
          ? { model, messages: this.messages, response_format: zodResponseFormat(responseSchema, "response") }
          : { model, messages: this.messages }
      );
      const assistantMessage = response.choices[0]?.message as any;
      if (!assistantMessage) throw new Error("No response from LLM");
      this.messages.push({ role: "assistant", content: assistantMessage.content || "" });

      if (responseSchema) {
        if (assistantMessage?.parsed) return assistantMessage.parsed as T;
        if (typeof assistantMessage.content === 'string' && assistantMessage.content.trim()) {
          try { return JSON.parse(assistantMessage.content) as T; } catch (e) { /* ignore */ }
        }
        try {
          const res2 = await getClient().chat.completions.create({ model, messages: this.messages, response_format: { type: 'json_object' } });
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

  getHistory(): Array<{ role: string; content: string }> { return [...this.messages]; }
  getMessageCount(): number { return this.messages.length; }
  reset() { const systemPrompt = this.messages[0]; this.messages = [systemPrompt]; }
}

export function createGameMasterSystemPrompt(gameSetup: GameSetup, players: Player[]): string {
  const rolesDescription = players.map(p => `- ${p.role.name}: Public Goal: "${p.role.publicObjective}" | Hidden Goal: "${p.role.hiddenObjective}"`).join("\n");
  return `You are the Game Master for "Simulacra", an AI-powered tabletop exercise (TTX).

**Scenario:** ${gameSetup.scenarioTitle}
${gameSetup.scenarioDescription}

**Core Metric:** ${gameSetup.coreMetric.name} (${gameSetup.coreMetric.description})
Starting at: ${gameSetup.coreMetric.value}

**Stakeholders:**
${rolesDescription}

- Max ${GAME_CONFIG.MAX_ROUNDS} rounds
- Each player has ${GAME_CONFIG.ACTION_POINTS_PER_ROUND} action points per round`;
}

export function createGameSession(gameSetup: GameSetup, players: Player[]): GameChatSession {
  const systemPrompt = createGameMasterSystemPrompt(gameSetup, players);
  return new GameChatSession(systemPrompt, gameSetup, players);
}
