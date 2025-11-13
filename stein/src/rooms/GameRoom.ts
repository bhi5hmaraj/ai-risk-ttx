import { Room, Client } from '@colyseus/core';
import { GameState } from '../schemas/GameState.js';

// Import your existing server logic
// Note: You'll need to copy server/ folder to stein/ or set up proper imports
import type { SessionSnapshot, SessionStore } from '../../server/stores/sessionStore.js';
import { MemorySessionStore } from '../../server/stores/sessionStore.memory.js';
import { RedisSessionStore } from '../../server/stores/sessionStore.redis.js';
import { GamePhase } from '../../server/types/core.js';
import * as llmService from '../../server/services/llmService.js';
import { applyConsequences, buildPlayersFromSetup } from '../../server/services/sessionEngine.js';

// Create advance state logic (copied from your route.ts)
function createAdvanceState(llmDep: any) {
  return async ({ session, context, emit }: any) => {
    const { state, players } = session;

    emit('progress', { stage: 'counterfactual' });

    // Generate counterfactual
    const counterfactualResp = await llmDep.generateCounterfactual({ gameState: state });
    const counterfactualScoreChange = counterfactualResp?.scoreChange ?? 0;

    // Generate AI turns in parallel
    const aiPlayers = players?.filter((p: any) => !p.isHuman) || [];
    const aiTurnPromises = aiPlayers.map(async (player: any) => {
      emit('progress', { role: player.role.name, stage: 'ai-turn' });
      const prevActions = state.eventLog.find((e: any) => e.round === state.round - 1)?.playerActions || null;
      const turn = await llmDep.generateAITurn({
        player,
        gameState: state,
        previousRoundActions: prevActions,
      });
      return { player, turn };
    });

    const aiTurns = await Promise.all(aiTurnPromises);

    // Build player actions array
    const allPlayerActions = [
      ...(context?.humanActions ? [{
        roleName: context.humanRoleName,
        actions: context.humanActions,
        availableOptions: context.humanAvailableOptions || [],
        isHuman: true,
      }] : []),
      ...aiTurns
        .filter(t => t.turn?.actions)
        .map(t => ({
          roleName: t.player.role.name,
          actions: t.turn.actions,
          availableOptions: t.turn.availableOptions || [],
          isHuman: false,
        })),
    ];

    emit('progress', { stage: 'consequences' });

    // Generate consequences
    const consequencesResp = await llmDep.generateConsequences({
      gameState: state,
      players: allPlayerActions,
      counterfactualScoreChange,
    });

    if (!consequencesResp) {
      throw new Error('Failed to generate consequences');
    }

    // Apply consequences
    const nextState = applyConsequences({
      state,
      consequences: consequencesResp,
      playerActions: allPlayerActions,
      counterfactualScoreChange,
    });

    // Reset phase and submitted
    nextState.phase = GamePhase.ACTION;

    return {
      ...session,
      state: nextState,
      submitted: {},
    };
  };
}

// LLM facade
const llm = {
  async generateActionOptions({ player, gameState, previousRoundActions }: any) {
    const resp = await llmService.generateActionOptions(player, gameState, previousRoundActions);
    return resp || { options: [] };
  },
  async generateDebrief() {
    return { summary: 'Simulation complete', keyEvents: [], userActions: [] };
  },
  async generateAITurn({ player, gameState, previousRoundActions }: any) {
    return llmService.generateAITurn(player, gameState, previousRoundActions);
  },
  async generateCounterfactual({ gameState }: any) {
    return llmService.generateCounterfactualConsequences(gameState);
  },
  async generateConsequences({ gameState, players, counterfactualScoreChange }: any) {
    return llmService.generateConsequences(gameState, players, counterfactualScoreChange);
  },
};

// Singleton store
const store: SessionStore = process.env.SESSION_STORE_TYPE === 'redis'
  ? new RedisSessionStore({ advanceState: createAdvanceState(llm) })
  : new MemorySessionStore({ advanceState: createAdvanceState(llm) });

export class GameRoom extends Room<GameState> {
  sessionId: string = '';
  unsubscribe?: () => void;

  async onCreate(options: { sessionId?: string; setup?: any; mode?: string }) {
    this.setState(new GameState());

    console.log('[GameRoom] onCreate', { options });

    // Create or load session
    if (options.sessionId) {
      // Load existing session
      const snapshot = await store.get(options.sessionId);
      if (!snapshot) {
        throw new Error('Session not found');
      }
      this.sessionId = snapshot.id;
      this.syncFromSnapshot(snapshot);
    } else {
      // Create new session
      const snapshot = await store.create({
        state: {
          phase: GamePhase.LOBBY,
          round: 0,
          coreMetric: { name: 'Democratic Legitimacy', description: '', value: 50 },
          eventLog: [],
          currentEvent: null,
        } as any,
        setup: options.setup,
      });
      this.sessionId = snapshot.id;
      this.syncFromSnapshot(snapshot);
    }

    // Subscribe to session updates (this replaces SSE!)
    this.unsubscribe = store.subscribe(this.sessionId, (event) => {
      console.log('[GameRoom] Session event:', event.type);
      this.syncFromSnapshot(event.snapshot);

      // Broadcast progress events to all clients
      if (event.type === 'progress') {
        this.broadcast('progress', event.payload);
      }
    });

    console.log(`[GameRoom] Created: ${this.roomId} → session ${this.sessionId}`);
  }

  onAuth(client: Client, options: any) {
    // For MVP: simple userId auth
    // TODO: Add proper session validation
    return { userId: options.userId || client.sessionId };
  }

  async onJoin(client: Client, options: any, auth: any) {
    console.log(`[GameRoom] Player ${auth.userId} joined`);
  }

  async onMessage(client: Client, type: string, message: any) {
    console.log('[GameRoom] Message:', type, message);

    try {
      switch (type) {
        case 'initialize':
          await this.handleInitialize(message);
          break;
        case 'get_action_options':
          await this.handleGetActionOptions(client, message);
          break;
        case 'submit_actions':
          await this.handleSubmitActions(client, message);
          break;
        case 'advance_round':
          await this.handleAdvanceRound(client, message);
          break;
        default:
          console.warn('[GameRoom] Unknown message type:', type);
      }
    } catch (err: any) {
      console.error('[GameRoom] Error handling message:', err);
      client.send('error', { message: err.message });
    }
  }

  async handleInitialize(message: any) {
    const snapshot = await store.get(this.sessionId);
    if (!snapshot || !snapshot.setup) {
      throw new Error('Session not ready for initialization');
    }

    // Build players from setup
    const players = buildPlayersFromSetup(snapshot.setup, message.humanRoleName || 'Election Commissioner');

    // Update session with initialized state
    const updated = await store.update(this.sessionId, snapshot.revision, (state) => ({
      ...state,
      phase: GamePhase.ACTION,
      round: 1,
    }));

    // Store will trigger subscription, which will sync state
  }

  async handleGetActionOptions(client: Client, message: any) {
    const { playerId, roleName, revision } = message;

    const snapshot = await store.get(this.sessionId);
    if (!snapshot) throw new Error('Session not found');

    const player = snapshot.players?.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const prevActions = snapshot.state.eventLog.find((e: any) => e.round === snapshot.state.round - 1)?.playerActions || null;

    const response = await llm.generateActionOptions({
      player,
      gameState: snapshot.state,
      previousRoundActions: prevActions,
    });

    client.send('action_options', { options: response.options });
  }

  async handleSubmitActions(client: Client, message: any) {
    const { playerId, actions, revision } = message;

    const updated = await store.submitActions(
      this.sessionId,
      playerId,
      revision,
      actions
    );

    // State syncs automatically via subscription
  }

  async handleAdvanceRound(client: Client, message: any) {
    const { hostToken, revision, context } = message;

    // Verify host token
    const snapshot = await store.get(this.sessionId);
    if (snapshot?.hostToken !== hostToken) {
      throw new Error('Invalid host token');
    }

    // Advance will trigger the full round processing
    const updated = await store.advance(this.sessionId, revision, context);

    // State syncs automatically via subscription
    client.send('round_advanced', { revision: updated.revision });
  }

  /**
   * Sync Colyseus state from SessionSnapshot
   * This is the bridge between your existing store and Colyseus
   */
  syncFromSnapshot(snapshot: SessionSnapshot) {
    this.state.phase = GamePhase[snapshot.state.phase] as string;
    this.state.round = snapshot.state.round;
    this.state.revision = snapshot.revision;
    this.state.coreMetricName = snapshot.state.coreMetric.name;
    this.state.coreMetricValue = snapshot.state.coreMetric.value;

    // Sync players
    if (snapshot.players) {
      snapshot.players.forEach(player => {
        let colyseusPlayer = this.state.players.get(player.id);
        if (!colyseusPlayer) {
          colyseusPlayer = new (this.state.players.constructor as any).prototype.constructor();
          this.state.players.set(player.id, colyseusPlayer);
        }
        colyseusPlayer.id = player.id;
        colyseusPlayer.roleName = player.role.name;
        colyseusPlayer.isHuman = player.isHuman;
        colyseusPlayer.hiddenScore = player.hiddenScore;
        colyseusPlayer.actionPoints = player.actionPoints;
        colyseusPlayer.hasSubmitted = snapshot.submitted[player.id] || false;
      });
    }

    // Sync submitted map
    this.state.submitted.clear();
    Object.entries(snapshot.submitted).forEach(([playerId, submitted]) => {
      this.state.submitted.set(playerId, submitted);
    });
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`[GameRoom] Player ${client.sessionId} left`);
  }

  onDispose() {
    console.log('[GameRoom] Room disposing');
    this.unsubscribe?.();
  }
}
