/**
 * Firebase Remote Config - Runtime Configuration Injection
 *
 * Battle-tested solution for Cloud Run deployment.
 * Update config in Firebase console → Live in seconds.
 *
 * Setup:
 * 1. npm install firebase-admin node-cache
 * 2. Enable Firebase in GCP console
 * 3. Set GOOGLE_CLOUD_PROJECT env var
 * 4. Use Firebase console to manage config
 */

import admin from 'firebase-admin';
import NodeCache from 'node-cache';

// ============================================================================
// INITIALIZATION
// ============================================================================

let initialized = false;

function initFirebase() {
  if (initialized) return;

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });

  initialized = true;
}

const remoteConfig = () => {
  initFirebase();
  return admin.remoteConfig();
};

// ============================================================================
// CACHING (1-minute TTL)
// ============================================================================

const cache = new NodeCache({
  stdTTL: 60, // 1 minute
  checkperiod: 120, // Cleanup every 2 minutes
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PromptConfig {
  version: string;
  system: string;
  temperature: number;
  maxTokens: number;
  notes?: string;
}

export interface LLMConfig {
  model: string;
  fallbackModel: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface FeatureFlags {
  useColyseus: boolean;
  enableChat: boolean;
  enableSpectators: boolean;
  rolloutNewUI: number; // 0-100 percentage
}

export interface AppConfig {
  prompts: {
    actionGeneration: PromptConfig;
    consequences: PromptConfig;
    aiPlayer: PromptConfig;
    counterfactual: PromptConfig;
  };
  llm: LLMConfig;
  features: FeatureFlags;
}

// ============================================================================
// CORE API
// ============================================================================

/**
 * Get raw config value from Firebase Remote Config
 * @param key - Config key (e.g., 'prompts_action_generation')
 * @returns Parsed JSON value or null
 */
async function getRawConfig(key: string): Promise<any> {
  try {
    const template = await remoteConfig().getTemplate();
    const param = template.parameters[key];

    if (!param?.defaultValue?.value) {
      console.warn(`[RemoteConfig] Key not found: ${key}`);
      return null;
    }

    // Parse JSON if it looks like JSON
    const value = param.defaultValue.value;
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      return JSON.parse(value);
    }

    return value;
  } catch (error) {
    console.error(`[RemoteConfig] Failed to fetch key: ${key}`, error);
    return null;
  }
}

/**
 * Get cached config value (1-minute TTL)
 * @param key - Config key
 * @returns Parsed value or null
 */
async function getCachedConfig(key: string): Promise<any> {
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const value = await getRawConfig(key);
  if (value !== null) {
    cache.set(key, value);
  }

  return value;
}

// ============================================================================
// TYPED GETTERS
// ============================================================================

/**
 * Get prompt configuration
 * @param category - Prompt category (e.g., 'action_generation')
 * @returns PromptConfig or default
 */
export async function getPromptConfig(
  category: 'action_generation' | 'consequences' | 'ai_player' | 'counterfactual'
): Promise<PromptConfig> {
  const key = `prompts_${category}`;
  const config = await getCachedConfig(key);

  if (!config) {
    console.warn(`[RemoteConfig] Using default prompt for: ${category}`);
    return DEFAULT_PROMPTS[category];
  }

  return config;
}

/**
 * Get LLM configuration
 */
export async function getLLMConfig(): Promise<LLMConfig> {
  const config = await getCachedConfig('llm_config');

  if (!config) {
    console.warn('[RemoteConfig] Using default LLM config');
    return DEFAULT_LLM_CONFIG;
  }

  return config;
}

/**
 * Get feature flag
 * @param flag - Flag name (e.g., 'use_colyseus')
 * @param userId - Optional user ID for percentage rollout
 * @returns true if enabled
 */
export async function getFeatureFlag(
  flag: string,
  userId?: string
): Promise<boolean> {
  const key = `feature_${flag}`;
  const value = await getCachedConfig(key);

  if (value === null || value === undefined) {
    return false;
  }

  // Boolean flags
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;

  // Percentage rollout (0-100)
  if (typeof value === 'number' && userId) {
    return hashUserId(userId) % 100 < value;
  }

  return false;
}

/**
 * Get all feature flags
 */
export async function getAllFeatureFlags(): Promise<FeatureFlags> {
  return {
    useColyseus: await getFeatureFlag('use_colyseus'),
    enableChat: await getFeatureFlag('enable_chat'),
    enableSpectators: await getFeatureFlag('enable_spectators'),
    rolloutNewUI: (await getCachedConfig('feature_rollout_new_ui')) || 0,
  };
}

/**
 * Get all app configuration (prompts + LLM + features)
 */
export async function getAppConfig(): Promise<AppConfig> {
  return {
    prompts: {
      actionGeneration: await getPromptConfig('action_generation'),
      consequences: await getPromptConfig('consequences'),
      aiPlayer: await getPromptConfig('ai_player'),
      counterfactual: await getPromptConfig('counterfactual'),
    },
    llm: await getLLMConfig(),
    features: await getAllFeatureFlags(),
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Hash user ID to deterministic 0-99 value
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Clear config cache (useful for testing)
 */
export function clearConfigCache() {
  cache.flushAll();
}

/**
 * Preload config into cache (call at server startup)
 */
export async function preloadConfig() {
  console.log('[RemoteConfig] Preloading configuration...');

  try {
    await Promise.all([
      getPromptConfig('action_generation'),
      getPromptConfig('consequences'),
      getPromptConfig('ai_player'),
      getPromptConfig('counterfactual'),
      getLLMConfig(),
      getAllFeatureFlags(),
    ]);

    console.log('[RemoteConfig] Configuration preloaded successfully');
  } catch (error) {
    console.error('[RemoteConfig] Failed to preload config:', error);
  }
}

// ============================================================================
// DEFAULT FALLBACKS
// ============================================================================

const DEFAULT_PROMPTS: Record<string, PromptConfig> = {
  action_generation: {
    version: 'v1-baseline',
    system: `You are a Game Master for an AI crisis simulation. Generate 5 action options for the player.`,
    temperature: 0.8,
    maxTokens: 1000,
    notes: 'Baseline prompt',
  },
  consequences: {
    version: 'v1-baseline',
    system: `You are a Game Master. Generate consequences with 3-5 chronological beats showing how events unfold.`,
    temperature: 0.7,
    maxTokens: 1200,
    notes: 'Timeline-focused',
  },
  ai_player: {
    version: 'v1-baseline',
    system: `You are an AI player with a hidden objective. Choose actions that advance your secret goal.`,
    temperature: 0.9,
    maxTokens: 600,
    notes: 'Strategic AI player',
  },
  counterfactual: {
    version: 'v1-baseline',
    system: `Generate the baseline outcome if no players take action this round.`,
    temperature: 0.7,
    maxTokens: 800,
    notes: 'Inaction baseline',
  },
};

const DEFAULT_LLM_CONFIG: LLMConfig = {
  model: 'gemini-2.5-flash',
  fallbackModel: 'gpt-4o-mini',
  timeoutMs: 30000,
  maxRetries: 2,
};

// ============================================================================
// ADMIN API (Update config via Vercel API or Firebase Admin SDK)
// ============================================================================

/**
 * Update remote config parameter
 * (Use this from admin API endpoint)
 */
export async function updateRemoteConfig(
  key: string,
  value: any
): Promise<void> {
  const template = await remoteConfig().getTemplate();

  template.parameters[key] = {
    defaultValue: {
      value: typeof value === 'string' ? value : JSON.stringify(value),
    },
  };

  await remoteConfig().publishTemplate(template);

  // Clear cache to force refetch
  cache.del(key);

  console.log(`[RemoteConfig] Updated key: ${key}`);
}

/**
 * List all remote config parameters
 */
export async function listRemoteConfig(): Promise<Record<string, any>> {
  const template = await remoteConfig().getTemplate();
  const config: Record<string, any> = {};

  for (const [key, param] of Object.entries(template.parameters)) {
    const value = param.defaultValue?.value;
    if (value) {
      try {
        config[key] = JSON.parse(value);
      } catch {
        config[key] = value;
      }
    }
  }

  return config;
}
