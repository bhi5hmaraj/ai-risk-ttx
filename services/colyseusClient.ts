/**
 * Colyseus-based client to replace SSE-based sessionClient
 *
 * Drop-in replacement for services/sessionClient.ts
 * Handles all WebSocket connection management, reconnection, state syncing
 *
 * Usage:
 *   const client = await ColyseusGameClient.create(setup);
 *   client.onStateChange((state) => { ... });
 *   await client.submitActions(playerId, actions);
 */

import { Client, Room } from 'colyseus.js';

interface GameSetup {
  scenarioTitle: string;
  scenarioDescription: string;
  coreMetric: any;
  stakeholders: any[];
  maxRounds?: number | null;
  maxAIPlayers?: number | null;
}

interface ActionOption {
  title: string;
  description: string;
  cost: number;
}

interface Player {
  id: string;
  roleName: string;
  isHuman: boolean;
  hasSubmitted: boolean;
  hiddenScore: number;
  actionPoints: number;
}

interface GameStateSnapshot {
  phase: string;
  round: number;
  revision: number;
  coreMetricName: string;
  coreMetricValue: number;
  players: Map<string, Player>;
  submitted: Map<string, boolean>;
}

export class ColyseusGameClient {
  private room: Room | null = null;
  private client: Client;
  private stateChangeCallbacks: Array<(state: GameStateSnapshot) => void> = [];
  private progressCallbacks: Array<(payload: any) => void> = [];

  private constructor() {
    const wsUrl = process.env.NEXT_PUBLIC_STEIN_URL || 'ws://localhost:2567';
    this.client = new Client(wsUrl);
  }

  /**
   * Create a new game session
   */
  static async create(setup: GameSetup, userId?: string): Promise<ColyseusGameClient> {
    const instance = new ColyseusGameClient();

    // Create room on Colyseus server
    instance.room = await instance.client.create('game', {
      setup,
      userId: userId || 'human_player',
    });

    instance.setupListeners();

    console.log('[ColyseusClient] Session created:', instance.room.sessionId);
    return instance;
  }

  /**
   * Join existing game session
   */
  static async join(sessionId: string, userId?: string): Promise<ColyseusGameClient> {
    const instance = new ColyseusGameClient();

    instance.room = await instance.client.joinById(sessionId, {
      userId: userId || 'human_player',
    });

    instance.setupListeners();

    console.log('[ColyseusClient] Joined session:', sessionId);
    return instance;
  }

  private setupListeners() {
    if (!this.room) return;

    // Listen to state changes (automatic with Colyseus!)
    this.room.onStateChange((state) => {
      console.log('[ColyseusClient] State changed');
      this.stateChangeCallbacks.forEach(cb => cb(state as any));
    });

    // Listen to progress events
    this.room.onMessage('progress', (payload) => {
      console.log('[ColyseusClient] Progress:', payload);
      this.progressCallbacks.forEach(cb => cb(payload));
    });

    // Listen to action options response
    this.room.onMessage('action_options', (payload) => {
      console.log('[ColyseusClient] Action options received:', payload);
      // Store in instance for retrieval
      (this as any)._lastActionOptions = payload.options;
    });

    // Listen to errors
    this.room.onMessage('error', (payload) => {
      console.error('[ColyseusClient] Server error:', payload);
    });

    // Reconnection handling (built-in!)
    this.room.onError((code, message) => {
      console.error('[ColyseusClient] Room error:', code, message);
    });

    this.room.onLeave((code) => {
      console.log('[ColyseusClient] Left room:', code);
    });
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.room?.id || '';
  }

  /**
   * Get current state revision
   */
  getRevision(): number {
    return this.room?.state.revision || 0;
  }

  /**
   * Register callback for state changes
   * Replaces SSE event listeners
   */
  onStateChange(callback: (state: GameStateSnapshot) => void) {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * Register callback for progress updates
   */
  onProgress(callback: (payload: any) => void) {
    this.progressCallbacks.push(callback);
  }

  /**
   * Initialize the game session (start from lobby)
   */
  async initialize(humanRoleName: string): Promise<void> {
    if (!this.room) throw new Error('Not connected');

    this.room.send('initialize', { humanRoleName });
  }

  /**
   * Get action options for a player
   */
  async getActionOptions(playerId: string, roleName: string): Promise<ActionOption[]> {
    if (!this.room) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout getting action options')), 30000);

      const checkInterval = setInterval(() => {
        const options = (this as any)._lastActionOptions;
        if (options) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          delete (this as any)._lastActionOptions;
          resolve(options);
        }
      }, 100);

      this.room!.send('get_action_options', {
        playerId,
        roleName,
        revision: this.getRevision(),
      });
    });
  }

  /**
   * Submit player actions
   */
  async submitActions(playerId: string, actions: ActionOption[]): Promise<void> {
    if (!this.room) throw new Error('Not connected');

    this.room.send('submit_actions', {
      playerId,
      actions,
      revision: this.getRevision(),
    });
  }

  /**
   * Advance to next round (host only)
   */
  async advanceRound(hostToken: string, context: any): Promise<void> {
    if (!this.room) throw new Error('Not connected');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout advancing round')), 60000);

      const handleAdvance = () => {
        clearTimeout(timeout);
        this.room!.off('round_advanced', handleAdvance);
        resolve();
      };

      this.room.onMessage('round_advanced', handleAdvance);

      this.room.send('advance_round', {
        hostToken,
        revision: this.getRevision(),
        context,
      });
    });
  }

  /**
   * Disconnect from session
   */
  disconnect(): void {
    this.room?.leave();
    this.room = null;
  }

  /**
   * Get current state snapshot
   */
  getState(): GameStateSnapshot | null {
    return this.room?.state as any || null;
  }
}
