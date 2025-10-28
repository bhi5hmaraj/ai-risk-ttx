/**
 * Game configuration constants
 * Pure TypeScript file with no React dependencies
 * Safe to import from both frontend and backend (API routes)
 */

export const GAME_CONFIG = {
  MAX_ROUNDS: 5,
  ACTION_PHASE_SECONDS: 300, // 5 minutes
  ACTION_POINTS_PER_ROUND: 3,
  MAX_ACTION_POINTS: 7,
  INITIAL_ACTION_POINTS: 3,
  // Feature flags
  USE_CHAT_MODE: true, // Enable chat mode for better context and caching
};
