/**
 * TODO[deprecate]: Legacy Session/SSE API (Not used in Colyseus flow)
 * - Status: DEPRECATED — kept temporarily for reference during Phase 2 rollout.
 * - Action: Remove this route and the related session store/router once Colyseus is stable in prod.
 * - Scope to delete together:
 *   - app/api/session/[[...parts]]/route.ts (this file)
 *   - server/api/session-router.ts
 *   - server/stores/sessionStore.* (memory/redis/tests)
 *   - hooks/useGameActions.ts and any SSE/EventSource code paths
 * - Tracking: docs/multiplayer/colyseus-migration-tasks.md → “Remove legacy session SSE APIs”.
 */
import { NextRequest } from 'next/server';
import { handleSessionRequest, type LLMFacade } from '@/server/api/session-router';
import { MemorySessionStore } from '@/server/stores/sessionStore.memory';
import { RedisSessionStore } from '@/server/stores/sessionStore.redis';
import type { AdvanceContext, SessionEvent, SessionSnapshot } from '@/server/stores/sessionStore';
import { applyConsequences, buildPlayersFromSetup } from '@/server/services/sessionEngine';
import * as llmService from '@/server/services/llmService';
import { GamePhase, type Player, type PlayerRoundActions, type ActionOption } from '@/server/types/core';
import { createReqId, getReqIdFromHeaders, slog, serr } from '@/server/lib/logger';
import { GAME_CONFIG } from '@/gameConfig';

// Use Node runtime for Fluid Compute (300s timeout) and better library compatibility
export const runtime = 'nodejs';
export const maxDuration = 300; // Fluid Compute: 5 minutes

const llm: LLMFacade = {
  async generateActionOptions({ player, gameState, previousRoundActions }) {
    const resp = await llmService.generateActionOptions(player, gameState, previousRoundActions);
    if (!resp) return { options: [] } as any;
    return resp as any;
  },
  async generateDebrief() {
    return { summary: 'Simulation complete', keyEvents: [], userActions: [] } as any;
  },
  async generateAITurn({ player, gameState, previousRoundActions }) {
    return llmService.generateAITurn(player, gameState, previousRoundActions);
  },
  async generateCounterfactual({ gameState }) {
    return llmService.generateCounterfactualConsequences(gameState);
  },
  async generateConsequences({ gameState, players, counterfactualScoreChange }) {
    return llmService.generateConsequences(gameState as any, players as any, counterfactualScoreChange);
  },
};

// Singleton pattern to survive HMR in development
// Use Redis if SESSION_STORE_TYPE=redis, otherwise use in-memory store
const globalForStore = globalThis as unknown as { sessionStore?: MemorySessionStore | RedisSessionStore };

function createStore() {
  const storeType = process.env.SESSION_STORE_TYPE;
  const advanceState = createAdvanceState(llm);

  if (storeType === 'redis') {
    console.log('[route.ts] Creating Redis session store');
    return new RedisSessionStore({ advanceState });
  }

  console.log('[route.ts] Creating memory session store');
  return new MemorySessionStore({ advanceState });
}

const store = globalForStore.sessionStore ?? createStore();
if (process.env.NODE_ENV !== 'production') {
  globalForStore.sessionStore = store;
  console.log('[route.ts] Using singleton store instance - sessions will survive HMR');
}

function ensureHumanRole(context: AdvanceContext | undefined, session: SessionSnapshot): { roleName: string; playerId: string } {
  const fallbackRole =
    context?.humanRoleName ||
    session.players?.find((p) => p.isHuman)?.role.name ||
    session.setup?.stakeholders?.[0]?.name ||
    'Lead Decision Maker';
  const fallbackId =
    context?.humanPlayerId || session.players?.find((p) => p.isHuman)?.id || 'human_player';
  return { roleName: fallbackRole, playerId: fallbackId };
}

function previousRoundActions(state: SessionSnapshot['state']): PlayerRoundActions[] | null {
  const prev = state.eventLog.find((entry) => entry.round === state.round - 1);
  return prev ? prev.playerActions : null;
}

function createAdvanceState(llmDep: LLMFacade) {
  return async ({
    session,
    context,
    emit,
  }: {
    session: SessionSnapshot;
    context?: AdvanceContext;
    emit: (type: 'update' | 'advance' | 'progress', snapshot: SessionSnapshot, payload?: Record<string, unknown>) => void;
  }) => {
    const rid = createReqId(`adv-${session.id}`);
    slog(rid, 'advance:start', { rev: session.revision, round: session.state.round });
    const { roleName: humanRoleName, playerId: humanPlayerId } = ensureHumanRole(context, session);
    const setup =
      session.setup || {
        scenarioTitle: session.state.currentEvent?.headline || 'Evolving Crisis',
        scenarioDescription: session.state.currentEvent?.detail || 'A fast-moving scenario requires coordinated response.',
        coreMetric: session.state.coreMetric,
        stakeholders: [
          {
            name: humanPlayerName(humanRoleName),
            icon: '🎯',
            publicObjective: 'Protect public welfare',
            hiddenObjective: 'Maintain stability',
            resources: [],
            constraints: [],
          },
        ],
      };

    const basePlayers = buildPlayersFromSetup(setup, humanRoleName, session.players);
    let playersWithHuman = basePlayers.map((player) =>
      player.isHuman
        ? { ...player, id: humanPlayerId, actions: context?.humanActions ?? [], hasSubmittedActions: true }
        : { ...player, actions: [], hasSubmittedActions: false }
    );

    const aiPlayers = playersWithHuman.filter((player) => !player.isHuman);
    const prevActions = previousRoundActions(session.state);

    // Kick off counterfactual immediately and run AI turns in parallel; emit progress as AIs complete.
    slog(rid, 'counterfactual:start');
    const counterfactualPromise = llmDep.generateCounterfactual({ gameState: session.state });
    let llmCalls = 0;
    const aiResults: Record<string, { options: ActionOption[]; chosenActions: ActionOption[] } | null> = {};
    await Promise.all(
      aiPlayers.map(async (aiPlayer) => {
        slog(rid, 'ai-turn:start', { role: aiPlayer.role.name });
        const result = await llmDep.generateAITurn({ player: aiPlayer, gameState: session.state, previousRoundActions: prevActions });
        llmCalls += 1;
        if (!result) {
          serr(rid, 'ai-turn:failed', { role: aiPlayer.role.name });
          throw new Error('Failed to generate AI player actions');
        }
        aiResults[aiPlayer.id] = result;
        slog(rid, 'ai-turn:done', { role: aiPlayer.role.name, chosen: result.chosenActions?.length || 0 });

        // Merge into snapshot and emit progress
        const interimPlayers: Player[] = playersWithHuman.map((p) =>
          p.id === aiPlayer.id
            ? { ...p, actions: result.chosenActions ?? [], hasSubmittedActions: true }
            : p
        );
        playersWithHuman = interimPlayers;
        const interimSnapshot: SessionSnapshot = {
          ...session,
          players: interimPlayers,
          submitted: { ...session.submitted, [aiPlayer.id]: true },
        };
        emit('progress', interimSnapshot, { stage: 'ai-turn', playerId: aiPlayer.id, role: aiPlayer.role.name });
      })
    );

    const playersWithActions: Player[] = playersWithHuman.map((player) => player);
    // Build ordered AI turn results array aligned with aiPlayers for consequence application
    const aiTurnResults: { options: ActionOption[]; chosenActions: ActionOption[] }[] = aiPlayers.map((p) => {
      const r = aiResults[p.id];
      return r ? r : { options: [], chosenActions: [] };
    });

    // Await counterfactual started earlier.
    const counterfactual = await counterfactualPromise;
    llmCalls += 1;
    if (!counterfactual) {
      serr(rid, 'counterfactual:failed');
      throw new Error('Failed to generate counterfactual consequences');
    }
    slog(rid, 'counterfactual:done', { delta: counterfactual.publicScoreUpdate });

    emit(
      'progress',
      {
        ...session,
        players: playersWithHuman,
      },
      { stage: 'counterfactual' }
    );

    slog(rid, 'consequences:start');
    const consequence = await llmDep.generateConsequences({
      gameState: session.state,
      players: playersWithActions,
      counterfactualScoreChange: counterfactual.publicScoreUpdate,
    });
    llmCalls += 1;
    if (!consequence) {
      serr(rid, 'consequences:failed');
      throw new Error('Failed to generate round consequences');
    }
    slog(rid, 'consequences:done');

    const { gameState: nextState, players: nextPlayers } = applyConsequences(
      session.state,
      consequence,
      playersWithActions,
      aiPlayers,
      aiTurnResults,
      context?.humanAvailableOptions ?? [],
      llmCalls,
    );

    // Check if game should end based on round limit or core metric failure
    const maxRounds = (session.setup as any)?.maxRounds as number; // normalized at create time
    const shouldEnd = nextState.round > maxRounds || nextState.coreMetric.value <= 0;
    const finalPhase = shouldEnd ? GamePhase.END : GamePhase.ACTION;

    const result = {
      state: { ...nextState, phase: finalPhase },
      players: nextPlayers,
    };
    slog(rid, 'advance:done', {
      nextRound: result.state.round,
      phase: finalPhase,
      shouldEnd,
      reason: shouldEnd ? (nextState.round > maxRounds ? 'max rounds' : 'core metric depleted') : undefined,
      llmCalls
    });
    return result;
  };
}

function humanPlayerName(name: string) {
  return name || 'Lead Decision Maker';
}

async function toHeaders(req: NextRequest) {
  const headers: Record<string, string | undefined> = {};
  req.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
  return headers;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ parts?: string[] }> }) {
  const { parts = [] } = await ctx.params;
  const headers = await toHeaders(req);
  const rid = getReqIdFromHeaders(req.headers) || createReqId('sess');
  const t0 = Date.now();
  const res = await handleSessionRequest('GET', parts, headers, null, { store, llm });
  try { (res as any).headers?.set?.('x-req-id', rid); } catch {}
  slog(rid, `GET /api/session/${parts.join('/')} done`, { status: (res as any).status, dt: Date.now() - t0 });
  return res;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ parts?: string[] }> }) {
  const { parts = [] } = await ctx.params;
  const headers = await toHeaders(req);
  const body = await req.json().catch(() => ({}));
  const rid = getReqIdFromHeaders(req.headers) || createReqId('sess');
  const t0 = Date.now();
  const res = await handleSessionRequest('POST', parts, headers, body, { store, llm });
  try { (res as any).headers?.set?.('x-req-id', rid); } catch {}
  slog(rid, `POST /api/session/${parts.join('/')} done`, { status: (res as any).status, dt: Date.now() - t0 });
  return res;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ parts?: string[] }> }) {
  const { parts = [] } = await ctx.params;
  const headers = await toHeaders(req);
  const body = await req.json().catch(() => ({}));
  const rid = getReqIdFromHeaders(req.headers) || createReqId('sess');
  const t0 = Date.now();
  const res = await handleSessionRequest('PATCH', parts, headers, body, { store, llm });
  try { (res as any).headers?.set?.('x-req-id', rid); } catch {}
  slog(rid, `PATCH /api/session/${parts.join('/')} done`, { status: (res as any).status, dt: Date.now() - t0 });
  return res;
}
