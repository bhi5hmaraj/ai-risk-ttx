/**
 * Colyseus Client Service
 *
 * Wrapper around colyseus.js Client for connecting to GameRoom.
 * Replaces the old HTTP-based SessionService with WebSocket-based real-time sync.
 */

import { Client, Room } from 'colyseus.js';
import type { GameState as ColyseusGameState } from '@/server/rooms/schema/GameState';

// Require explicit Colyseus URL from env; no hardcoded or same-origin fallback
const COLYSEUS_URL = process.env.NEXT_PUBLIC_COLYSEUS_URL as string | undefined;
if (!COLYSEUS_URL) {
  throw new Error('[ColyseusClient] NEXT_PUBLIC_COLYSEUS_URL is not set. Define it in .env.local (dev) or deployment env.');
}

console.log('[ColyseusClient] Server URL:', COLYSEUS_URL);

let clientInstance: Client | null = null;

/**
 * Get or create the singleton Colyseus client
 */
export function getColyseusClient(): Client {
  if (!clientInstance) {
    clientInstance = new Client(COLYSEUS_URL);
  }
  return clientInstance;
}

/**
 * Generate a unique trace ID for logging/debugging
 */
function generateTraceId(): string {
  return 'trace-' + Math.random().toString(36).substring(2, 15);
}

export interface JoinRoomOptions {
  name: string;
  role: string;
  isHuman?: boolean;
  gameId?: string; // Room code for joining existing games or creating with specific ID
  traceId?: string;
  gameSetup?: any | null;
  maxRounds?: number;
  isHost?: boolean;
}

/**
 * Join or create a game room
 *
 * Uses gameId-based matchmaking: clients with the same gameId will join the same room.
 * - If gameId is provided: joins existing room or creates new one with that gameId
 * - If no gameId: server generates a new unique room code
 *
 * @param options - Player info (name, role, gameId, etc.)
 * @returns Connected Colyseus room instance
 */
export async function joinGameRoom(options: JoinRoomOptions): Promise<Room<ColyseusGameState>> {
  const client = getColyseusClient();
  const traceId = options.traceId || generateTraceId();

  console.log(`[${traceId}] Joining game room...`, {
    ...options,
    gameSetup: options.gameSetup ? '(present)' : '(none)',
  });

  try {
    // joinOrCreate with gameId filter:
    // - Server uses filterBy(['gameId'])
    // - Clients with same gameId land in same room instance
    // - If no gameId, server generates new room code
    const room = await client.joinOrCreate('game', {
      ...options,
      traceId,
    });

    console.log(`[${traceId}] Joined room successfully!`, {
      roomId: room.roomId,
      sessionId: room.sessionId,
      gameId: (room.state as any)?.roomCode || '(waiting for sync)',
    });
    return room as Room<ColyseusGameState>;
  } catch (error) {
    console.error(`[${traceId}] Failed to join room:`, error);
    throw error;
  }
}

/**
 * Join a specific room by ID (for reconnection or room codes)
 *
 * @param roomId - The room ID to join
 * @param options - Player info
 * @returns Connected Colyseus room instance
 */
export async function joinRoomById(roomId: string, options: JoinRoomOptions): Promise<Room<ColyseusGameState>> {
  const client = getColyseusClient();
  const traceId = options.traceId || generateTraceId();

  console.log(`[${traceId}] Joining room by ID:`, roomId);

  try {
    const room = await client.joinById(roomId, {
      ...options,
      traceId,
    });

    console.log(`[${traceId}] Joined room successfully!`, room.sessionId);
    return room as Room<ColyseusGameState>;
  } catch (error) {
    console.error(`[${traceId}] Failed to join room:`, error);
    throw error;
  }
}

/**
 * Join the built-in Colyseus LobbyRoom with optional filter.
 * Use filter: { name: 'game', metadata: { gameId } } to discover a specific game.
 */
export async function joinLobby(filter?: { name?: string; metadata?: Record<string, any> }) {
  const client = getColyseusClient();
  const traceId = generateTraceId();
  try {
    console.log(`[${traceId}] Joining lobby with filter:`, filter);
    // @ts-ignore – filters are accepted by LobbyRoom
    const room = await client.joinOrCreate('lobby', filter ? { filter } : undefined);
    console.log(`[${traceId}] Joined lobby successfully!`, { roomId: room.roomId });
    return room;
  } catch (error) {
    console.error(`[${traceId}] Failed to join lobby:`, error);
    throw error;
  }
}

/**
 * Reconnect to a room using a reconnection token
 *
 * @param roomId - The room ID
 * @param sessionId - The player's session ID
 * @returns Connected Colyseus room instance
 */
export async function reconnectToRoom(reconnectionToken: string): Promise<Room<ColyseusGameState>> {
  const client = getColyseusClient();

  console.log('[ColyseusClient] Reconnecting to room with token...');

  try {
    const room = await client.reconnect(reconnectionToken);

    console.log('[ColyseusClient] Reconnected successfully!');
    return room as Room<ColyseusGameState>;
  } catch (error) {
    console.error('[ColyseusClient] Reconnection failed:', error);
    throw error;
  }
}

/**
 * Leave and cleanup a room
 *
 * @param room - The room to leave
 */
export async function leaveRoom(room: Room | null): Promise<void> {
  if (!room) return;

  try {
    console.log('[ColyseusClient] Leaving room:', room.roomId);
    await room.leave();
    console.log('[ColyseusClient] Left room successfully');
  } catch (error) {
    console.error('[ColyseusClient] Error leaving room:', error);
  }
}
