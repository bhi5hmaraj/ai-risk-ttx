/**
 * Vercel Edge Config - Runtime Configuration Injection
 *
 * Simple, battle-tested, no custom infrastructure needed.
 * Update config in Vercel dashboard → Live instantly
 */

import { get, getAll } from '@vercel/edge-config';

// ============================================================================
// 1. SIMPLE INJECTION PATTERN
// ============================================================================

// Get single config value
export async function getPromptConfig(category: string) {
  const prompts = await get(`prompts_${category}`);
  return prompts || DEFAULT_PROMPTS[category];
}

// Get all config at once
export async function getAllConfig() {
  return await getAll();
}

// ============================================================================
// 2. USAGE IN COLYSEUS GAMEROOM
// ============================================================================

import { Room } from '@colyseus/core';

export class GameRoom extends Room {
  async onCreate() {
    // Inject config at runtime
    this.config = await getAll();
    console.log('Loaded config:', this.config);
  }

  async onMessage(client: Client, type: string, message: any) {
    if (type === 'get_action_options') {
      // Fetch latest prompt config
      const promptConfig = await get('prompts_action_generation');

      const options = await generateActionOptions({
        systemPrompt: promptConfig.system,
        temperature: promptConfig.temperature,
        maxTokens: promptConfig.maxTokens,
        context: this.getGameContext(),
      });

      client.send('action_options', options);
    }
  }
}

// ============================================================================
// 3. WHAT YOU STORE IN EDGE CONFIG (JSON)
// ============================================================================

/**
 * In Vercel dashboard, you create Edge Config with this JSON:
 *
 * {
 *   "prompts_action_generation": {
 *     "version": "v3-moral-dilemmas",
 *     "system": "You are a Game Master...",
 *     "temperature": 0.8,
 *     "maxTokens": 1000,
 *     "notes": "Emphasizes ethical trade-offs"
 *   },
 *   "prompts_consequences": {
 *     "version": "v2-timeline-focused",
 *     "system": "Generate consequences with 3-5 chronological beats...",
 *     "temperature": 0.7,
 *     "maxTokens": 1200
 *   },
 *   "prompts_ai_player": {
 *     "version": "v1-baseline",
 *     "system": "You are an AI player with a hidden objective...",
 *     "temperature": 0.9,
 *     "maxTokens": 600
 *   },
 *   "feature_flags": {
 *     "use_colyseus": true,
 *     "enable_chat": false,
 *     "rollout_new_ui": 10
 *   },
 *   "llm_config": {
 *     "model": "gemini-2.5-flash",
 *     "fallback_model": "gpt-4o-mini",
 *     "timeout_ms": 30000
 *   }
 * }
 *
 * Click "Save" → Live in < 1 second globally
 */

// ============================================================================
// 4. TYPED CONFIG (Type Safety)
// ============================================================================

interface PromptConfig {
  version: string;
  system: string;
  temperature: number;
  maxTokens: number;
  notes?: string;
}

interface AppConfig {
  prompts_action_generation: PromptConfig;
  prompts_consequences: PromptConfig;
  prompts_ai_player: PromptConfig;
  feature_flags: {
    use_colyseus: boolean;
    enable_chat: boolean;
    rollout_new_ui: number;
  };
  llm_config: {
    model: string;
    fallback_model: string;
    timeout_ms: number;
  };
}

export async function getTypedConfig(): Promise<AppConfig> {
  return (await getAll()) as AppConfig;
}

// ============================================================================
// 5. CACHING PATTERN (Optional)
// ============================================================================

let configCache: AppConfig | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

export async function getCachedConfig(): Promise<AppConfig> {
  const now = Date.now();

  if (!configCache || now - lastFetch > CACHE_TTL_MS) {
    configCache = await getTypedConfig();
    lastFetch = now;
  }

  return configCache;
}

// ============================================================================
// 6. MIGRATION FROM ENV VARS
// ============================================================================

// Before (env vars):
const useColyseus = process.env.FEATURE_USE_COLYSEUS === 'true';
const promptVariant = process.env.PROMPT_VARIANT_ACTION_GENERATION || 'v1';

// After (Edge Config):
const config = await getTypedConfig();
const useColyseus = config.feature_flags.use_colyseus;
const promptConfig = config.prompts_action_generation;

// ============================================================================
// 7. ADMIN UI INTEGRATION
// ============================================================================

/**
 * You can build admin UI that:
 * 1. Reads current Edge Config via Vercel API
 * 2. Shows diff of proposed changes
 * 3. Updates Edge Config via Vercel API
 *
 * Or just use Vercel dashboard directly (it's pretty good!)
 */

// Example: Update via Vercel API (from your admin panel)
async function updateConfig(newConfig: Partial<AppConfig>) {
  const response = await fetch(
    `https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: Object.entries(newConfig).map(([key, value]) => ({
          operation: 'upsert',
          key,
          value,
        })),
      }),
    }
  );

  return response.json();
}

// ============================================================================
// SETUP (1-time, 5 minutes)
// ============================================================================

/**
 * 1. Install SDK:
 *    npm install @vercel/edge-config
 *
 * 2. Create Edge Config in Vercel dashboard:
 *    Project Settings → Storage → Create Edge Config
 *
 * 3. Add connection string to env:
 *    EDGE_CONFIG=https://edge-config.vercel.com/...
 *
 * 4. Use anywhere in your app:
 *    import { get } from '@vercel/edge-config';
 *    const config = await get('key');
 *
 * Done! No database, no custom infra, battle-tested by Vercel.
 */
