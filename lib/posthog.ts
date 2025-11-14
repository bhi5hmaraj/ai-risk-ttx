/**
 * PostHog Feature Flags + Analytics
 *
 * Use cases:
 * - Swap prompts based on user group (A/B testing)
 * - Gradual rollout (10% → 50% → 100%)
 * - User-specific config (premium users get different prompts)
 * - Analytics (which prompt variant performs better)
 *
 * Free tier: 1M events/month
 */

import { PostHog } from 'posthog-node';

// Server-side PostHog client
let posthog: PostHog | null = null;

export function getPostHog(): PostHog {
  if (!posthog) {
    posthog = new PostHog(
      process.env.NEXT_PUBLIC_POSTHOG_KEY!,
      {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      }
    );
  }
  return posthog;
}

/**
 * Get feature flag value (supports JSON payloads!)
 *
 * Examples:
 * - Boolean: isEnabled('use-colyseus', userId) → true/false
 * - String: getFlag('prompt-variant', userId) → 'v1' | 'v2'
 * - JSON: getFlag('prompt-config', userId) → { system: '...', temperature: 0.7 }
 */
export async function getFlag<T = boolean>(
  flag: string,
  userId: string,
  defaultValue?: T
): Promise<T> {
  try {
    const ph = getPostHog();
    const value = await ph.getFeatureFlag(flag, userId);

    if (value === undefined || value === null) {
      return defaultValue as T;
    }

    return value as T;
  } catch (error) {
    console.error('[PostHog] Failed to get flag:', flag, error);
    return defaultValue as T;
  }
}

/**
 * Get prompt configuration based on user
 *
 * In PostHog dashboard, create flag "prompt-variants" with JSON payload:
 * {
 *   "system": "You are a helpful AI assistant...",
 *   "temperature": 0.7,
 *   "maxTokens": 500
 * }
 */
interface PromptConfig {
  system: string;
  temperature?: number;
  maxTokens?: number;
}

export async function getPromptConfig(
  promptName: string,
  userId: string,
  defaultConfig: PromptConfig
): Promise<PromptConfig> {
  const flagName = `prompt-${promptName}`;
  return await getFlag<PromptConfig>(flagName, userId, defaultConfig);
}

/**
 * Track events (for analytics)
 */
export function trackEvent(
  userId: string,
  event: string,
  properties?: Record<string, any>
) {
  try {
    const ph = getPostHog();
    ph.capture({
      distinctId: userId,
      event,
      properties,
    });
  } catch (error) {
    console.error('[PostHog] Failed to track event:', error);
  }
}

/**
 * Flush events on shutdown (important!)
 */
export async function shutdownPostHog() {
  if (posthog) {
    await posthog.shutdown();
  }
}

// Auto-flush on process exit
if (typeof process !== 'undefined') {
  process.on('SIGTERM', shutdownPostHog);
  process.on('SIGINT', shutdownPostHog);
}

/**
 * Usage Examples:
 */

// Example 1: Simple boolean flag
// const useColyseus = await getFlag('use-colyseus', userId, false);
// if (useColyseus) { /* ... */ }

// Example 2: Prompt variant (A/B test)
// const variant = await getFlag('action-prompt-variant', userId, 'v1');
// const prompt = variant === 'v2' ? ACTION_PROMPT_V2 : ACTION_PROMPT_V1;

// Example 3: Full prompt config (JSON payload)
// const config = await getPromptConfig('action-generation', userId, {
//   system: DEFAULT_SYSTEM_PROMPT,
//   temperature: 0.7
// });
//
// const response = await openai.chat.completions.create({
//   model: 'gpt-4',
//   messages: [{ role: 'system', content: config.system }],
//   temperature: config.temperature,
// });

// Example 4: Track which prompt performed better
// trackEvent(userId, 'action_generated', {
//   prompt_variant: 'v2',
//   action_quality: 'high', // Your metric
// });

/**
 * React Hook (for client-side)
 */

// In components, use PostHog React SDK:
// import { useFeatureFlagEnabled, useFeatureFlagPayload } from 'posthog-js/react';
//
// function GameScreen() {
//   const useColyseus = useFeatureFlagEnabled('use-colyseus');
//   const promptConfig = useFeatureFlagPayload('prompt-config');
//
//   return useColyseus ? <ColyseusGame /> : <SSEGame />;
// }
