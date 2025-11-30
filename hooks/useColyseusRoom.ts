/**
 * useColyseusRoom Hook (deprecated)
 *
 * Legacy, all‑in‑one hook that connects to a Colyseus room and wires listeners.
 * Not used by the current architecture:
 *  - Provider is transport‑only
 *  - providers/colyseusRoomListeners.ts handles event→store projection
 *  - hooks/useLobbyListing.ts handles built‑in lobby discovery
 *  - hooks/useGameSenders.ts provides small, typed senders
 *
 * Keep for reference during migration; do not use in new code.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Room } from 'colyseus.js';
import type { GameState as ColyseusGameState, Player as ColyseusPlayer } from '@/server/rooms/schema/GameState';
import { joinGameRoom, leaveRoom as colyseusLeaveRoom } from '@/services/colyseusClient';
import { MapSchema } from '@colyseus/schema';

export interface UseColyseusRoomOptions {
  playerName: string;
  playerRole: string;
  isHuman?: boolean;
  onStateChange?: (state: ColyseusGameState) => void;
  onPlayerUpdate?: (players: Map<string, ColyseusPlayer>) => void;
  onMessage?: (type: string, message: any) => void;
  onError?: (error: Error) => void;
}

export interface UseColyseusRoomResult {
  room: Room<ColyseusGameState> | null;
  state: ColyseusGameState | null;
  players: Map<string, ColyseusPlayer> | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  reconnectionToken: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendMessage: (type: string, message: any) => void;
  setRole: (role: string, name?: string) => void;
  submitAction: (actionId: string, cost: number) => void;
  startGame: () => void;
}

export function useColyseusRoom(options: UseColyseusRoomOptions): UseColyseusRoomResult {
  const [room, setRoom] = useState<Room<ColyseusGameState> | null>(null);
  const [state, setState] = useState<ColyseusGameState | null>(null);
  const [players, setPlayers] = useState<Map<string, ColyseusPlayer> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectionToken, setReconnectionToken] = useState<string | null>(null);

  const roomRef = useRef<Room<ColyseusGameState> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Convert MapSchema to Map for easier consumption
  const convertPlayersToMap = useCallback((playersSchema: MapSchema<ColyseusPlayer>): Map<string, ColyseusPlayer> => {
    const map = new Map<string, ColyseusPlayer>();
    playersSchema.forEach((player, key) => {
      map.set(key, player);
    });
    return map;
  }, []);

  const connect = useCallback(async () => {
    if (roomRef.current || isConnecting) {
      console.log('[useColyseusRoom] Already connected or connecting');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const newRoom = await joinGameRoom({
        name: options.playerName,
        role: options.playerRole,
        isHuman: options.isHuman ?? true,
      });

      roomRef.current = newRoom;
      setRoom(newRoom);
      setIsConnected(true);

      // Store reconnection token for potential reconnects
      // Best practice: Save this to localStorage for persistence across page reloads
      if (newRoom.reconnectionToken) {
        setReconnectionToken(newRoom.reconnectionToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('colyseus_reconnection_token', newRoom.reconnectionToken);
          // Room ID is available via roomId property (not id)
          localStorage.setItem('colyseus_room_id', newRoom.roomId || '');
        }
      }

      // Set up state change listener
      // Note: onStateChange fires on every sync (initial + all updates)
      // For fine-grained control, consider using Schema callbacks (onChange)
      newRoom.onStateChange((newState) => {
        console.log('[useColyseusRoom] State changed:', {
          phase: newState.phase,
          round: newState.round,
          publicScore: newState.publicScore,
        });
        setState(newState);
        setPlayers(convertPlayersToMap(newState.players));
        options.onStateChange?.(newState);
      });

      // Note: MapSchema onAdd/onRemove callbacks are not exposed in TypeScript types
      // We rely on onStateChange for player updates instead (simpler for now)

      // Set up message listeners for server broadcasts
      // Listen to known message types (add more as needed)
      newRoom.onMessage('new_round', (message: any) => {
        console.log('[useColyseusRoom] New round:', message);
      });

      newRoom.onMessage('all_submitted', () => {
        console.log('[useColyseusRoom] All players submitted actions');
      });

      newRoom.onMessage('game_started', () => {
        console.log('[useColyseusRoom] Game started!');
      });

      // Error handling
      newRoom.onError((code, message) => {
        console.error('[useColyseusRoom] Room error:', code, message);
        const err = new Error(`Room error ${code}: ${message}`);
        setError(err);
        options.onError?.(err);
      });

      // Leave handling
      newRoom.onLeave((code) => {
        console.log('[useColyseusRoom] Left room with code:', code);
        setIsConnected(false);
        roomRef.current = null;
        setRoom(null);
      });

      console.log('[useColyseusRoom] Connected successfully!', {
        roomId: newRoom.roomId,
        sessionId: newRoom.sessionId,
      });

      // Store cleanup function
      cleanupRef.current = async () => {
        try {
          // Remove all listeners before leaving (best practice)
          if (roomRef.current) {
            roomRef.current.removeAllListeners();
          }
          await colyseusLeaveRoom(roomRef.current);
          roomRef.current = null;
          setRoom(null);
          setIsConnected(false);

          // Clean up reconnection tokens
          if (typeof window !== 'undefined') {
            localStorage.removeItem('colyseus_reconnection_token');
            localStorage.removeItem('colyseus_room_id');
          }
        } catch (err) {
          console.error('[useColyseusRoom] Cleanup error:', err);
        }
      };
    } catch (err) {
      console.error('[useColyseusRoom] Connection failed:', err);
      const error = err instanceof Error ? err : new Error('Connection failed');
      setError(error);
      options.onError?.(error);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [options, isConnecting, convertPlayersToMap]);

  const disconnect = useCallback(async () => {
    if (cleanupRef.current) {
      await cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  // Message sending helpers
  const sendMessage = useCallback((type: string, message: any) => {
    if (roomRef.current) {
      roomRef.current.send(type, message);
    } else {
      console.warn('[useColyseusRoom] Cannot send message - not connected');
    }
  }, []);

  const setRole = useCallback((role: string, name?: string) => {
    sendMessage('set_role', { role, name });
  }, [sendMessage]);

  const submitAction = useCallback((actionId: string, cost: number) => {
    sendMessage('submit_action', { actionId, cost });
  }, [sendMessage]);

  const startGame = useCallback(() => {
    sendMessage('start_game', {});
  }, [sendMessage]);

  // No client-side advance: server advances when all submissions are in or timer expires.

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return {
    room,
    state,
    players,
    isConnected,
    isConnecting,
    error,
    reconnectionToken,
    connect,
    disconnect,
    sendMessage,
    setRole,
    submitAction,
    startGame,
  };
}
