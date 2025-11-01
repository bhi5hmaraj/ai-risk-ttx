/**
 * Game configuration constants
 * Pure TypeScript file with no React dependencies
 * Safe to import from both frontend and backend (API routes)
 */

const n = (v: string | undefined, def: number) => {
  const x = v && Number.parseInt(v, 10);
  return Number.isFinite(x as number) && (x as number) > 0 ? (x as number) : def;
};

// Allow runtime overrides via env (Next.js: use NEXT_PUBLIC_* on client; server: non-public fallback)
const MAX_ROUNDS = n(process.env.NEXT_PUBLIC_GAME_MAX_ROUNDS || process.env.GAME_MAX_ROUNDS, 5);
const MAX_AI_PLAYERS = n(process.env.NEXT_PUBLIC_GAME_AI_PLAYERS || process.env.GAME_AI_PLAYERS, 5);

export const GAME_CONFIG = {
  MAX_ROUNDS,
  MAX_AI_PLAYERS, // Number of AI stakeholders (in addition to the human)
  ACTION_PHASE_SECONDS: 300, // 5 minutes
  ACTION_POINTS_PER_ROUND: 3,
  MAX_ACTION_POINTS: 7,
  INITIAL_ACTION_POINTS: 3,
};
