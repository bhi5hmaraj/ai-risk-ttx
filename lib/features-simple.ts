/**
 * Simple Environment Variable Feature Flags
 *
 * Sufficient for MVP. No external dependencies.
 * Toggle via Cloud Run console (< 1 minute).
 *
 * Usage:
 * - FEATURE_USE_COLYSEUS=true (binary on/off)
 * - FEATURE_NEW_PROMPT=rollout:10 (10% of users)
 */

/**
 * Check if feature is enabled
 *
 * @param feature - Feature name (e.g., 'USE_COLYSEUS')
 * @param userId - Optional user ID for percentage rollout
 * @returns true if feature is enabled for this user
 */
export function isFeatureEnabled(feature: string, userId?: string): boolean {
  const envKey = `FEATURE_${feature}`;
  const value = process.env[envKey];

  if (!value) return false;

  // Binary on/off
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;

  // Percentage rollout (e.g., "rollout:50" = 50% of users)
  if (value.startsWith('rollout:') && userId) {
    const percentage = parseInt(value.split(':')[1]);
    const userHash = hashUserId(userId);
    return userHash % 100 < percentage;
  }

  return false;
}

/**
 * Hash user ID to deterministic 0-99 value
 * Same user always gets same hash (stable rollout)
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
 * React hook for feature flags (client-side)
 *
 * Uses NEXT_PUBLIC_FEATURE_* env vars (exposed to client)
 */
export function useFeature(feature: string): boolean {
  const envKey = `NEXT_PUBLIC_FEATURE_${feature}`;
  return process.env[envKey] === 'true';
}

/**
 * Example usage:
 *
 * // Server-side
 * if (isFeatureEnabled('USE_COLYSEUS', userId)) {
 *   return <ColyseusGame />;
 * } else {
 *   return <SSEGame />;
 * }
 *
 * // Client-side (React)
 * const enableChat = useFeature('HUMAN_CHAT');
 * {enableChat && <ChatBox />}
 *
 * // Percentage rollout
 * if (isFeatureEnabled('NEW_PROMPT', userId)) {
 *   // 10% of users get new prompt
 * }
 */

/**
 * How to toggle in Cloud Run:
 *
 * # Enable feature
 * gcloud run services update simulacra \
 *   --update-env-vars="FEATURE_USE_COLYSEUS=true"
 *
 * # Disable feature
 * gcloud run services update simulacra \
 *   --update-env-vars="FEATURE_USE_COLYSEUS=false"
 *
 * # Gradual rollout (10% of users)
 * gcloud run services update simulacra \
 *   --update-env-vars="FEATURE_NEW_PROMPT=rollout:10"
 */
