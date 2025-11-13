import { Room, Client } from '@colyseus/core';
import { GameState, Player, LogEntry, Message } from '../schemas/GameState';
import { GamePhase } from '../../server/types/core';
import * as AI from '../lib/ai';
import type { ActionOption, PlayerRoundActions } from '../../server/types/core';
import { buildPlayersFromSetup } from '../../server/services/sessionEngine';
import type { GameSetup } from '../../server/types/core';

/**
 * Main game room
 *
 * This is self-contained and can be extracted to a separate service later.
 * All game logic lives here or in game-server/lib/
 */
export class GameRoom extends Room<GameState> {
  maxClients = 6;
  hostToken: string = '';
  gameSetup: GameSetup | null = null;

  async onCreate(options: { setup?: GameSetup; hostToken?: string }) {
    this.setState(new GameState());

    // Store host token for authorization
    this.hostToken = options.hostToken || this.generateToken();
    this.gameSetup = options.setup || null;

    if (this.gameSetup) {
      this.state.coreMetricName = this.gameSetup.coreMetric.name;
      this.state.coreMetricDescription = this.gameSetup.coreMetric.description;
      this.state.coreMetricValue = this.gameSetup.coreMetric.value;
      this.state.maxRounds = this.gameSetup.maxRounds || 5;
    }

    console.log('[GameRoom] Created:', this.roomId);

    // Handle messages
    this.onMessage('initialize', (client, message) => this.handleInitialize(client, message));
    this.onMessage('get_action_options', (client, message) => this.handleGetActionOptions(client, message));
    this.onMessage('submit_actions', (client, message) => this.handleSubmitActions(client, message));
    this.onMessage('advance_round', (client, message) => this.handleAdvanceRound(client, message));
    this.onMessage('chat', (client, message) => this.handleChat(client, message));
  }

  onAuth(client: Client, options: any) {
    // Simple auth for now - just accept userId
    return { userId: options.userId || client.sessionId };
  }

  async onJoin(client: Client, options: any, auth: any) {
    console.log('[GameRoom] Player joined:', auth.userId);

    // Create player
    const player = new Player();
    player.id = auth.userId;
    player.roleName = options.role || 'Observer';
    player.isHuman = true;
    player.actionPoints = this.state.actionPointsPerRound;

    this.state.players.set(client.sessionId, player);

    // Send host token to first player (they become host)
    if (this.state.players.size === 1) {
      client.send('host_token', { token: this.hostToken });
    }
  }

  async handleInitialize(client: Client, message: { humanRoleName?: string }) {
    if (!this.gameSetup) {
      client.send('error', { message: 'No game setup provided' });
      return;
    }

    // Build full player roster from setup
    const players = buildPlayersFromSetup(
      this.gameSetup,
      message.humanRoleName || this.state.players.get(client.sessionId)?.roleName || 'Election Commissioner'
    );

    // Add all players to state
    this.state.players.clear();
    players.forEach((p) => {
      const player = new Player();
      player.id = p.id;
      player.roleName = p.role.name;
      player.isHuman = p.isHuman;
      player.hiddenScore = p.hiddenScore;
      player.actionPoints = p.actionPoints;
      this.state.players.set(p.id, player);
    });

    // Set initial state
    this.state.phase = GamePhase[GamePhase.ACTION] as string;
    this.state.round = 1;
    this.state.revision++;

    this.logEvent(`Game started! Round 1 begins.`);
    console.log('[GameRoom] Initialized with', this.state.players.size, 'players');
  }

  async handleGetActionOptions(client: Client, message: { playerId: string; roleName: string }) {
    try {
      const player = this.findPlayerById(message.playerId);
      if (!player) {
        client.send('error', { message: 'Player not found' });
        return;
      }

      // Get previous round actions for context
      const prevActions = this.getPreviousRoundActions();

      // Generate options using AI
      const response = await AI.generateActionOptions(
        this.colyseusPlayerToGamePlayer(player),
        this.colyseusStateToGameState(),
        prevActions
      );

      if (!response) {
        client.send('error', { message: 'Failed to generate action options' });
        return;
      }

      client.send('action_options', { options: response.options });
    } catch (err: any) {
      console.error('[GameRoom] Error generating action options:', err);
      client.send('error', { message: err.message });
    }
  }

  async handleSubmitActions(client: Client, message: { playerId: string; actions: ActionOption[] }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      client.send('error', { message: 'Player not found' });
      return;
    }

    player.hasSubmitted = true;
    this.state.submitted.set(message.playerId, true);
    this.state.revision++;

    this.logEvent(`${player.roleName} submitted actions`);
    console.log('[GameRoom] Player submitted:', player.roleName);
  }

  async handleAdvanceRound(client: Client, message: { hostToken: string; context: any }) {
    // Verify host token
    if (message.hostToken !== this.hostToken) {
      client.send('error', { message: 'Invalid host token' });
      return;
    }

    try {
      console.log('[GameRoom] Advancing round...');
      this.broadcast('progress', { stage: 'starting' });

      // 1. Generate counterfactual
      this.broadcast('progress', { stage: 'counterfactual' });
      const counterfactualResp = await AI.generateCounterfactual(this.colyseusStateToGameState());
      const counterfactualScoreChange = counterfactualResp?.scoreChange ?? 0;

      // 2. Generate AI turns in parallel
      const aiPlayers = Array.from(this.state.players.values()).filter((p) => !p.isHuman);
      const prevActions = this.getPreviousRoundActions();

      const aiTurnPromises = aiPlayers.map(async (player) => {
        this.broadcast('progress', { role: player.roleName, stage: 'ai-turn' });
        const turn = await AI.generateAITurn(
          this.colyseusPlayerToGamePlayer(player),
          this.colyseusStateToGameState(),
          prevActions
        );
        return { player, turn };
      });

      const aiTurns = await Promise.all(aiTurnPromises);

      // 3. Build all player actions
      const allPlayerActions: PlayerRoundActions[] = [
        // Human actions (from context)
        ...(message.context?.humanActions
          ? [
              {
                roleName: message.context.humanRoleName,
                actions: message.context.humanActions,
                availableOptions: message.context.humanAvailableOptions || [],
                isHuman: true,
              },
            ]
          : []),
        // AI actions
        ...aiTurns
          .filter((t) => t.turn?.actions)
          .map((t) => ({
            roleName: t.player.roleName,
            actions: t.turn!.actions,
            availableOptions: t.turn!.availableOptions || [],
            isHuman: false,
          })),
      ];

      // 4. Generate consequences
      this.broadcast('progress', { stage: 'consequences' });
      const consequencesResp = await AI.generateConsequences(
        this.colyseusStateToGameState(),
        allPlayerActions.map((a) => this.colyseusPlayerToGamePlayer(this.findPlayerByRole(a.roleName)!)),
        counterfactualScoreChange
      );

      if (!consequencesResp) {
        throw new Error('Failed to generate consequences');
      }

      // 5. Apply consequences
      this.state.coreMetricValue += consequencesResp.publicScoreChange;
      this.logEvent(consequencesResp.roundSummary);

      // Add outcome timeline to log
      consequencesResp.outcomeTimeline.forEach((item) => {
        this.logEvent(`${item.title}: ${item.description}`);
      });

      // 6. Advance to next round
      this.state.round++;
      this.state.revision++;

      // Reset submitted
      this.state.submitted.clear();
      this.state.players.forEach((p) => {
        p.hasSubmitted = false;
        p.actionPoints = this.state.actionPointsPerRound;
      });

      // Check if game should end
      if (this.state.round > this.state.maxRounds || this.state.coreMetricValue <= 0) {
        this.state.phase = GamePhase[GamePhase.END] as string;
        this.logEvent('Game ended!');
      } else {
        this.state.phase = GamePhase[GamePhase.ACTION] as string;
      }

      this.broadcast('round_advanced', { round: this.state.round });
      console.log('[GameRoom] Round advanced to', this.state.round);
    } catch (err: any) {
      console.error('[GameRoom] Error advancing round:', err);
      this.broadcast('error', { message: err.message });
    }
  }

  async handleChat(client: Client, message: { text: string }) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const msg = new Message();
    msg.from = player.roleName;
    msg.text = message.text;
    msg.timestamp = Date.now();

    this.state.messages.push(msg);
    console.log('[GameRoom] Chat:', player.roleName, ':', message.text);
  }

  onLeave(client: Client, consented: boolean) {
    console.log('[GameRoom] Player left:', client.sessionId);
    this.state.players.delete(client.sessionId);

    // If host left and there are still players, assign new host
    if (this.state.players.size > 0) {
      const newHost = Array.from(this.state.players.keys())[0];
      this.clients.find((c) => c.sessionId === newHost)?.send('host_token', { token: this.hostToken });
    }
  }

  onDispose() {
    console.log('[GameRoom] Room disposed:', this.roomId);
  }

  // Helper methods

  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private findPlayerById(id: string): Player | undefined {
    return Array.from(this.state.players.values()).find((p) => p.id === id);
  }

  private findPlayerByRole(roleName: string): Player | undefined {
    return Array.from(this.state.players.values()).find((p) => p.roleName === roleName);
  }

  private logEvent(text: string) {
    const entry = new LogEntry();
    entry.round = this.state.round;
    entry.text = text;
    entry.timestamp = Date.now();
    this.state.eventLog.push(entry);
  }

  private getPreviousRoundActions(): PlayerRoundActions[] | null {
    // TODO: Build from event log if needed
    // For now, return null (AI will work without it)
    return null;
  }

  /**
   * Convert Colyseus Player to game Player type
   * (bridge between Colyseus schemas and existing types)
   */
  private colyseusPlayerToGamePlayer(player: Player): any {
    return {
      id: player.id,
      role: { name: player.roleName },
      isHuman: player.isHuman,
      hiddenScore: player.hiddenScore,
      actionPoints: player.actionPoints,
      actions: [],
      hasSubmittedActions: player.hasSubmitted,
    };
  }

  /**
   * Convert Colyseus GameState to game GameState type
   */
  private colyseusStateToGameState(): any {
    return {
      phase: this.state.phase,
      round: this.state.round,
      coreMetric: {
        name: this.state.coreMetricName,
        description: this.state.coreMetricDescription,
        value: this.state.coreMetricValue,
      },
      eventLog: this.state.eventLog.map((e) => ({
        round: e.round,
        roundSummary: e.text,
        // ... other fields would be populated from full log
      })),
      currentEvent: null,
    };
  }
}
