/**
 * Game configuration constants
 * Pure TypeScript file with no React dependencies
 * Safe to import from both frontend and backend (API routes)
 */

// Static defaults; authoritative values come from session setup
const MAX_ROUNDS = 5;
const MAX_AI_PLAYERS = 5;
// Custom scenarios may allow more AI players (in addition to the human)
const MAX_AI_PLAYERS_CUSTOM = 10;

export const GAME_CONFIG = {
  MAX_ROUNDS,
  MAX_AI_PLAYERS, // Number of AI stakeholders (in addition to the human)
  MAX_AI_PLAYERS_CUSTOM, // Custom/public scenarios maximum AI players
  ACTION_PHASE_SECONDS: 300, // 5 minutes
  ACTION_POINTS_PER_ROUND: 3,
  MAX_ACTION_POINTS: 10,
  INITIAL_ACTION_POINTS: 3,
};
