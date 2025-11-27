/**
 * Colyseus Client Service
 *
 * Wrapper around colyseus.js Client for connecting to GameRoom.
 * Replaces the old HTTP-based SessionService with WebSocket-based real-time sync.
 */

import { Client, Room } from 'colyseus.js';
import type { GameState as ColyseusGameState } from '@/server/rooms/schema/GameState';

// Get Colyseus server URL from environment or default to localhost
const COLYSEUS_URL =
  process.env.NEXT_PUBLIC_COLYSEUS_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    : 'ws://localhost:3000'
  );

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
  traceId?: string;
}

/**
 * Join or create a game room
 *
 * @param options - Player info (name, role, etc.)
 * @returns Connected Colyseus room instance
 */
export async function joinGameRoom(options: JoinRoomOptions): Promise<Room<ColyseusGameState>> {
  const client = getColyseusClient();
  const traceId = options.traceId || generateTraceId();

  console.log(`[${traceId}] Joining game room...`, options);

  try {
    const room = await client.joinOrCreate('game', {
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
