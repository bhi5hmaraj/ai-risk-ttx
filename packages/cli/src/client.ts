/**
 * Colyseus client wrapper for Simulacra
 */

import { Client, Room } from 'colyseus.js';
import { MessageLogger } from './logger.js';

export interface GameClientOptions {
  serverUrl: string;
  apiUrl?: string; // Optional API URL for fetching scenarios (defaults to http://localhost:3000)
  logger: MessageLogger;
  onStateChange?: (state: any) => void;
  onMessage?: (type: string, message: any) => void;
  onError?: (error: Error) => void;
}

export class GameClient {
  private client: Client;
  private room: Room | null = null;
  private logger: MessageLogger;
  private options: GameClientOptions;
  private apiUrl: string;

  constructor(options: GameClientOptions) {
    this.options = options;
    this.logger = options.logger;
    this.client = new Client(options.serverUrl);
    // Default to localhost:3000 for API if not provided
    this.apiUrl = options.apiUrl || 'http://localhost:3000';
  }

  /**
   * Fetch available scenarios from the API
   */
  async fetchScenarios(): Promise<any[]> {
    try {
      const url = `${this.apiUrl}/api/scenarios/catalog?sortBy=votes&limit=10`;
      this.logger.info(`Fetching scenarios from: ${url}`);

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        this.logger.success(`Fetched ${data.scenarios.length} scenarios`);
        return data.scenarios;
      } else {
        this.logger.error('Failed to fetch scenarios', new Error(data.error || 'Unknown error'));
        return [];
      }
    } catch (error) {
      this.logger.error('Failed to fetch scenarios', error as Error);
      return [];
    }
  }

  /**
   * Create a new game room
   */
  async createRoom(roomName: string = 'simulacra_room', gameSetup?: any): Promise<Room> {
    try {
      this.logger.info(`Creating room: ${roomName}`);
      const options: any = { isHost: true };
      if (gameSetup) {
        options.gameSetup = gameSetup;
        this.logger.info(`Using custom scenario: ${gameSetup.scenarioTitle}`);
      }
      this.room = await this.client.create(roomName, options);
      this.setupRoomHandlers();
      this.logger.success(`Room created! Code: ${this.room.id}`);
      return this.room;
    } catch (error) {
      this.logger.error('Failed to create room', error as Error);
      throw error;
    }
  }

  /**
   * Join an existing room by ID
   */
  async joinRoom(roomId: string, roomName: string = 'simulacra_room'): Promise<Room> {
    try {
      this.logger.info(`Joining room: ${roomId}`);
      this.room = await this.client.joinById(roomId);
      this.setupRoomHandlers();
      this.logger.success(`Joined room: ${roomId}`);
      return this.room;
    } catch (error) {
      this.logger.error('Failed to join room', error as Error);
      throw error;
    }
  }

  /**
   * Join or create a room
   */
  async joinOrCreate(roomName: string = 'simulacra_room'): Promise<Room> {
    try {
      this.logger.info(`Joining or creating room: ${roomName}`);
      this.room = await this.client.joinOrCreate(roomName);
      this.setupRoomHandlers();
      this.logger.success(`Connected to room: ${this.room.id}`);
      return this.room;
    } catch (error) {
      this.logger.error('Failed to join/create room', error as Error);
      throw error;
    }
  }

  /**
   * Setup room event handlers
   */
  private setupRoomHandlers() {
    if (!this.room) return;

    // State change handler
    this.room.onStateChange((state) => {
      this.logger.logServerMessage('state_change', {
        phase: state.phase,
        round: state.round,
        playerCount: state.players ? Object.keys(state.players).length : 0,
      });
      this.options.onStateChange?.(state);
    });

    // Generic message handler - catch all messages
    this.room.onMessage('*', (type, message) => {
      this.logger.logServerMessage(type, message);
      this.options.onMessage?.(type, message);
    });

    // Error handler
    this.room.onError((code, message) => {
      const error = new Error(`Room error (${code}): ${message}`);
      this.logger.error('Room error', error);
      this.options.onError?.(error);
    });

    // Leave handler
    this.room.onLeave((code) => {
      this.logger.warn(`Left room with code: ${code}`);
    });
  }

  /**
   * Send a message to the server
   */
  send(type: string, data?: any) {
    if (!this.room) {
      this.logger.error('Cannot send message: Not connected to room');
      return;
    }

    this.logger.logClientMessage(type, data);
    this.room.send(type, data);
  }

  /**
   * Get current room state
   */
  getState(): any {
    return this.room?.state;
  }

  /**
   * Get room ID
   */
  getRoomId(): string | null {
    return this.room?.id || null;
  }

  /**
   * Get session ID (current player's ID)
   */
  getSessionId(): string | null {
    return this.room?.sessionId || null;
  }

  /**
   * Leave the current room
   */
  async leave() {
    if (this.room) {
      await this.room.leave();
      this.room = null;
      this.logger.info('Left room');
    }
  }

  /**
   * Check if connected to a room
   */
  isConnected(): boolean {
    return this.room !== null;
  }
}
