import { z } from 'zod';
import {
  PatchSessionRequestSchema,
  JoinSessionRequestSchema,
  ActionOptionsRequestSchema,
  SubmitActionsRequestSchema,
  AdvanceRequestSchema,
  DebriefRequestSchema,
  GameSetupSchema,
} from '@/server/types/session';
import { normalizeGameSetup } from '@/server/types/scenario';
import type { GameSetup as CoreGameSetup } from '@/server/types/core';
import type { SessionStore } from '@/server/stores/sessionStore';
import { MemorySessionStore } from '@/server/stores/sessionStore.memory';
import { createValidGameState } from '@/tests/fixtures/session-data';
import { GAME_CONFIG } from '../../gameConfig';
import type { Player, RoleDataCore, PlayerRoundActions, GameState, ActionOption, AIConsequenceResponse, AITurnResponse, AICounterfactualResponse } from '@/server/types/core';

export interface LLMFacade {
  generateActionOptions: (args: { player: Player; gameState: GameState; previousRoundActions: PlayerRoundActions[] | null }) => Promise<{ options: any[] }>;
  generateDebrief: (args: { sessionId: string }) => Promise<{ summary: string; keyEvents: any[]; userActions: any[] }>;
  generateAITurn: (args: { player: Player; gameState: GameState; previousRoundActions: PlayerRoundActions[] | null }) => Promise<AITurnResponse | null>;
  generateCounterfactual: (args: { gameState: GameState }) => Promise<AICounterfactualResponse | null>;
  generateConsequences: (args: { gameState: GameState; players: Player[]; counterfactualScoreChange: number }) => Promise<AIConsequenceResponse | null>;
}

export interface RouterDeps {
  store: SessionStore;
  llm: LLMFacade;
}

function json(status: number, body: any, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

function etagFromRev(rev: number) {
  return String(rev);
}

export async function handleSessionRequest(
  method: string,
  parts: string[],
  headers: Record<string, string | undefined>,
  body: any,
  deps: RouterDeps
): Promise<Response> {
  const t0 = Date.now();
  const route = `/${parts.join('/')}` || '/';
  try {
    // Health check endpoint - tests entire backend stack
    if (method === 'GET' && parts.length === 1 && parts[0] === 'health') {
      const s0 = Date.now();
      const health: Record<string, any> = {
        api: true,
        timestamp: Date.now(),
        store: 'unknown',
        storeLatency: 0,
      };

      // Test session store connectivity (works with any store implementation)
      try {
        const testStart = Date.now();
        // Try to get a non-existent session - fast operation that tests store connectivity
        await deps.store.get('health-check-probe');
        health.store = 'ok';
        health.storeLatency = Date.now() - testStart;
      } catch (err: any) {
        health.store = 'error';
        health.storeError = err?.message || 'Unknown error';
      }

      const latency = Date.now() - s0;
      console.log(`[session-router] health check: store=${health.store}, latency=${latency}ms`);

      // Return 503 if store is down, 200 if everything is ok
      const status = health.store === 'ok' ? 200 : 503;
      return json(status, { success: health.store === 'ok', data: health });
    }

    if (method === 'POST' && parts.length === 0) {
      const s0 = Date.now();
      const req = (body ?? {}) as any;
      const mode = (req.mode === 'ai_safety' || req.mode === 'custom' || req.mode === 'classic') ? req.mode : 'classic';

      // Setup is now REQUIRED (Phase 0.2: Remove fallback)
      if (!req.setup) {
        return json(400, { success: false, error: 'setup is required' });
      }

      const ok = GameSetupSchema.safeParse(req.setup);
      if (!ok.success) {
        const reasons = ok.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ');
        return json(400, { success: false, error: `Invalid setup: ${reasons}` });
      }

      const norm = normalizeGameSetup(ok.data as any);
      const setup: CoreGameSetup = {
        scenarioTitle: norm.scenarioTitle,
        scenarioDescription: norm.scenarioDescription,
        coreMetric: norm.coreMetric,
        stakeholders: norm.stakeholders.map((s) => ({
          name: s.name,
          icon: s.icon,
          publicObjective: s.publicObjective,
          hiddenObjective: s.hiddenObjective,
          resources: s.resources ?? [],
          constraints: s.constraints ?? [],
        })),
        maxRounds: norm.maxRounds,
        maxAIPlayers: norm.maxAIPlayers,
      };

      // Validate stakeholder count (4-6 for classic/ai_safety, flexible for custom)
      const stakeholderCount = setup.stakeholders?.length ?? 0;
      if (mode === 'classic' || mode === 'ai_safety') {
        if (stakeholderCount < 4 || stakeholderCount > 6) {
          return json(400, { success: false, error: `${mode} mode requires 4-6 stakeholders, got ${stakeholderCount}` });
        }
      } else if (stakeholderCount < 2) {
        return json(400, { success: false, error: `At least 2 stakeholders required, got ${stakeholderCount}` });
      }

      const state = createValidGameState({
        phase: 0 as any, // LOBBY
        round: 0,
        coreMetric: setup.coreMetric,
        eventLog: [],
        currentEvent: null,
      }) as any;

      const created = await deps.store.create({ state, setup });
      console.log(`[session-router] create: OK with ${stakeholderCount} stakeholders in ${Date.now() - s0}ms`);
      return json(
        201,
        { success: true, data: { id: created.id, revision: created.revision, hostToken: created.hostToken, state: created.state } },
        { ETag: etagFromRev(created.revision), 'x-revision': String(created.revision) }
      );
    }

    // Expect a session id as first segment for the rest
    const [sessionId, action] = parts;
    if (!sessionId) return json(404, { success: false, error: 'Not Found' });

    if (method === 'GET' && parts.length === 1) {
      const s0 = Date.now();
      const snap = await deps.store.get(sessionId);
      if (!snap) return json(404, { success: false, error: 'Not Found' });
      const inm = headers['if-none-match'];
      if (inm && inm === etagFromRev(snap.revision)) {
        return new Response(null, { status: 304, headers: { ETag: etagFromRev(snap.revision), 'x-revision': String(snap.revision) } });
      }
      console.log(`[session-router] get:${sessionId} OK in ${Date.now() - s0}ms`);
      return json(
        200,
        { success: true, data: { id: snap.id, state: snap.state, revision: snap.revision, deadlineAt: snap.deadlineAt, submitted: snap.submitted, players: snap.players, setup: snap.setup } },
        { ETag: etagFromRev(snap.revision), 'x-revision': String(snap.revision) }
      );
    }

    if (method === 'PATCH' && parts.length === 1) {
      const s0 = Date.now();
      const parsed = PatchSessionRequestSchema.parse(body ?? {});
      const ifMatch = headers['if-match'];
      if (!ifMatch) return json(400, { success: false, error: 'Missing If-Match' });
      const expected = Number.parseInt(ifMatch, 10);
      const updated = await deps.store.update(sessionId, expected, (s) => s);
      console.log(`[session-router] patch:${sessionId} OK in ${Date.now() - s0}ms`);
      return json(200, { success: true, data: { id: updated.id, state: updated.state, revision: updated.revision } }, { ETag: etagFromRev(updated.revision), 'x-revision': String(updated.revision) });
    }

    if (method === 'POST' && action === 'join') {
      const _parsed = JoinSessionRequestSchema.parse(body ?? {});
      // For Phase 1 we only mint a token; binding to a seat comes later
      const token = 'player_' + Math.random().toString(36).slice(2, 10);
      return json(200, { success: true, data: { playerToken: token } }, { 'set-cookie': `player_token=${token}; Path=/; HttpOnly` });
    }

    if (method === 'POST' && action === 'action-options') {
      const parsed = ActionOptionsRequestSchema.parse(body ?? {});
      const s0 = Date.now();
      console.log(`[generate/action-options]: sessionId=${sessionId}, playerId=${parsed.playerId}, role=${parsed.playerRoleName}`);
      const snap = await deps.store.get(sessionId);
      if (!snap) {
        console.error(`[generate/action-options]: session not found: ${sessionId}`);
        return json(404, { success: false, error: 'Not Found' });
      }
      console.log(`[generate/action-options]: session found, round=${snap.state.round}, phase=${snap.state.phase}, setup=${!!snap.setup}`);
      // Build Player from setup + roleName; if not provided, use first stakeholder
      const roleName = parsed.playerRoleName ?? snap.setup?.stakeholders?.[0]?.name ?? 'Unknown';
      const stakeholder = snap.setup?.stakeholders?.find(s => s.name === roleName) || snap.setup?.stakeholders?.[0];
      const role: RoleDataCore = stakeholder ? {
        name: stakeholder.name,
        publicObjective: stakeholder.publicObjective,
        hiddenObjective: stakeholder.hiddenObjective,
        resources: stakeholder.resources || [],
        constraints: stakeholder.constraints || [],
      } : { name: roleName, publicObjective: '', hiddenObjective: '', resources: [], constraints: [] };
      const player: Player = {
        id: parsed.playerId,
        role,
        isHuman: true,
        hiddenScore: 0,
        actionPoints: GAME_CONFIG.INITIAL_ACTION_POINTS,
        actions: [],
        hasSubmittedActions: false,
      };
      const prev = snap.state.eventLog.find(e => e.round === snap.state.round - 1)?.playerActions ?? null;
      console.log(`[generate/action-options]: calling LLM for player ${player.role.name}`);
      const data = await deps.llm.generateActionOptions({ player, gameState: snap.state, previousRoundActions: prev });
      console.log(`[generate/action-options]: result=OK, options=${data?.options?.length || 0} in ${Date.now() - s0}ms`);
      return json(200, { success: true, data }, {});
    }

    if (method === 'POST' && action === 'actions') {
      const parsed = SubmitActionsRequestSchema.parse(body ?? {});
      const ifMatch = headers['if-match'];
      if (!ifMatch) return json(400, { success: false, error: 'Missing If-Match' });
      const expected = Number.parseInt(ifMatch, 10);
      const s0 = Date.now();
      const snap = await deps.store.submitActions(sessionId, parsed.playerId, expected, parsed.actions as any);
      console.log(`[session-router] actions:${sessionId} OK in ${Date.now() - s0}ms`);
      return json(200, { success: true, data: { id: snap.id, state: snap.state, revision: snap.revision, submitted: snap.submitted } }, { ETag: etagFromRev(snap.revision), 'x-revision': String(snap.revision) });
    }

    if (method === 'POST' && action === 'advance') {
      const parsed = AdvanceRequestSchema.parse(body ?? {});
      const ifMatch = headers['if-match'];
      if (!ifMatch) return json(400, { success: false, error: 'Missing If-Match' });
      const expected = Number.parseInt(ifMatch, 10);
      const snap = await deps.store.get(sessionId);
      if (!snap) return json(404, { success: false, error: 'Not Found' });
      const host = headers['x-host-token'];
      if (!host || host !== snap.hostToken) return json(403, { success: false, error: 'Forbidden' });
      const s0 = Date.now();
      const adv = await deps.store.advance(sessionId, expected, parsed as any);
      console.log(`[session-router] advance:${sessionId} OK in ${Date.now() - s0}ms`);
      return json(200, { success: true, data: { id: adv.id, state: adv.state, revision: adv.revision, players: adv.players, setup: adv.setup, submitted: adv.submitted } }, { ETag: etagFromRev(adv.revision), 'x-revision': String(adv.revision) });
    }

    if (method === 'POST' && action === 'initialize') {
      const s0 = Date.now();
      const snap = await deps.store.get(sessionId);
      if (!snap) return json(404, { success: false, error: 'Not Found' });

      console.log(`[session-router] initialize:${sessionId} starting scenario generation`);
      // Initialize with basic event from setup - move from LOBBY to ACTION phase
      const updated = await deps.store.update(sessionId, snap.revision, (state) => ({
        ...state,
        phase: 2, // ACTION
        round: 1,
        currentEvent: {
          headline: snap.setup?.scenarioTitle || 'Crisis Develops',
          detail: snap.setup?.scenarioDescription || 'A situation requires immediate attention.',
        },
      } as any));

      console.log(`[session-router] initialize:${sessionId} OK in ${Date.now() - s0}ms`);
      return json(200, {
        success: true,
        data: { id: updated.id, state: updated.state, revision: updated.revision }
      }, { ETag: etagFromRev(updated.revision), 'x-revision': String(updated.revision) });
    }

    if (method === 'POST' && action === 'debrief') {
      const _parsed = DebriefRequestSchema.parse(body ?? {});
      const s0 = Date.now();
      const res = await deps.llm.generateDebrief({ sessionId });
      console.log(`[generate/debrief]: result=OK in ${Date.now() - s0}ms`);
      return json(200, { success: true, data: res });
    }

    return json(404, { success: false, error: 'Not Found' });
  } catch (err: any) {
    console.error(`[session-router] ${method} ${route} error:`, err?.message || err);
    if (err?.name === 'ZodError') {
      return json(400, { success: false, error: err.errors?.[0]?.message ?? 'Invalid request' });
    }
    if (err?.name === 'RevisionConflictError' && err.latest) {
      const latest = err.latest;
      return json(409, { success: false, error: 'Revision mismatch', latest: { id: latest.id, state: latest.state, revision: latest.revision } }, { ETag: etagFromRev(latest.revision), 'x-revision': String(latest.revision) });
    }
    return json(500, { success: false, error: err?.message ?? 'Internal Error' });
  } finally {
    const dt = Date.now() - t0;
    console.log(`[session-router] ${method} ${route || '/'} completed in ${dt}ms`);
  }
}

// Convenience factory for tests
export function makeTestRouterDeps(): RouterDeps {
  const store = new MemorySessionStore({
    advanceState: async ({ session }) => ({
      state: {
        ...session.state,
        round: session.state.round + 1,
      },
      players: session.players,
    }),
  });

  const llm: LLMFacade = {
    async generateActionOptions() {
      return { options: [{ title: 'Test', description: 'Test', cost: 1 }] } as any;
    },
    async generateDebrief() {
      return { summary: 'ok', keyEvents: [], userActions: [] } as any;
    },
    async generateAITurn() {
      return { options: [], chosenActions: [], reasoning: 'stub' };
    },
    async generateCounterfactual() {
      return { publicScoreUpdate: 0 };
    },
    async generateConsequences({ gameState }) {
      return {
        roundSummary: 'Stub consequence',
        outcomeTimeline: [],
        counterfactualNote: '',
        publicScoreUpdate: 0,
        hiddenScoreUpdates: [],
        nextEvent: gameState.currentEvent ?? { headline: 'Next', detail: 'Stub detail' },
      };
    },
  };

  return { store, llm };
}
