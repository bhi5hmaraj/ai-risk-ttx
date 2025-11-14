/**
 * Feature Flag System
 *
 * Simple environment-based feature flags for safe rollout
 * Can be upgraded to LaunchDarkly/PostHog later without changing call sites
 */

export enum Feature {
  // Migration flags
  USE_COLYSEUS = 'USE_COLYSEUS',
  USE_SSE = 'USE_SSE',

  // New features
  HUMAN_CHAT = 'HUMAN_CHAT',
  SPECTATOR_MODE = 'SPECTATOR_MODE',
  AI_PROGRESS_INDICATORS = 'AI_PROGRESS_INDICATORS',

  // Experimental
  MATRIX_SERVICE = 'MATRIX_SERVICE',
  AUTONOMOUS_AI = 'AUTONOMOUS_AI',
}

interface FeatureConfig {
  enabled: boolean;
  rolloutPercentage?: number; // 0-100
  allowedUsers?: string[];
}

class FeatureFlags {
  private config: Map<Feature, FeatureConfig> = new Map();

  constructor() {
    this.loadFromEnvironment();
  }

  private loadFromEnvironment() {
    // Load from environment variables
    // Format: FEATURE_USE_COLYSEUS=true
    //         FEATURE_HUMAN_CHAT=rollout:50 (50% rollout)
    //         FEATURE_MATRIX_SERVICE=users:user1,user2

    Object.values(Feature).forEach((feature) => {
      const envKey = `FEATURE_${feature}`;
      const envValue = process.env[envKey];

      if (!envValue) {
        // Default: disabled
        this.config.set(feature, { enabled: false });
        return;
      }

      // Parse value
      if (envValue === 'true' || envValue === '1') {
        this.config.set(feature, { enabled: true });
      } else if (envValue === 'false' || envValue === '0') {
        this.config.set(feature, { enabled: false });
      } else if (envValue.startsWith('rollout:')) {
        const percentage = parseInt(envValue.split(':')[1]);
        this.config.set(feature, {
          enabled: true,
          rolloutPercentage: percentage,
        });
      } else if (envValue.startsWith('users:')) {
        const users = envValue.split(':')[1].split(',');
        this.config.set(feature, {
          enabled: true,
          allowedUsers: users,
        });
      }
    });

    console.log('[FeatureFlags] Loaded configuration:', this.getConfig());
  }

  /**
   * Check if feature is enabled for given user
   */
  isEnabled(feature: Feature, userId?: string): boolean {
    const config = this.config.get(feature);
    if (!config || !config.enabled) return false;

    // Check user allowlist
    if (config.allowedUsers) {
      return userId ? config.allowedUsers.includes(userId) : false;
    }

    // Check rollout percentage
    if (config.rolloutPercentage !== undefined) {
      if (!userId) return false;

      // Deterministic hash-based rollout
      const hash = this.hashUserId(userId);
      return hash < config.rolloutPercentage;
    }

    // Fully enabled
    return true;
  }

  /**
   * Get feature config (for debugging)
   */
  getConfig(): Record<string, FeatureConfig> {
    const result: Record<string, FeatureConfig> = {};
    this.config.forEach((config, feature) => {
      result[feature] = config;
    });
    return result;
  }

  /**
   * Hash user ID to deterministic 0-100 value
   * Same user always gets same hash (stable rollout)
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 100;
  }
}

// Singleton instance
export const features = new FeatureFlags();

/**
 * React hook for feature flags
 */
export function useFeature(feature: Feature, userId?: string): boolean {
  return features.isEnabled(feature, userId);
}

/**
 * Server-side feature check
 */
export function isFeatureEnabled(feature: Feature, userId?: string): boolean {
  return features.isEnabled(feature, userId);
}

/**
 * Example usage:
 *
 * // In React component
 * const useColyseus = useFeature(Feature.USE_COLYSEUS, userId);
 *
 * if (useColyseus) {
 *   return <ColyseusGame />;
 * } else {
 *   return <SSEGame />;
 * }
 *
 * // In server
 * if (isFeatureEnabled(Feature.MATRIX_SERVICE)) {
 *   return await callMatrix(...);
 * } else {
 *   return await directLLMCall(...);
 * }
 */

/**
 * Upgrade path to PostHog (analytics + feature flags):
 *
 * npm install posthog-js posthog-node
 *
 * class FeatureFlags {
 *   private posthog = new PostHog('your-api-key');
 *
 *   isEnabled(feature: Feature, userId?: string): boolean {
 *     if (!userId) return this.config.get(feature)?.enabled || false;
 *
 *     // Check PostHog
 *     return this.posthog.isFeatureEnabled(feature, userId);
 *   }
 * }
 */
