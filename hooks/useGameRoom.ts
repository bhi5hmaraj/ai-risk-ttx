/**
 * React hook for Colyseus game room connection
 *
 * Drop-in replacement for SSE-based session management
 * Automatically handles WebSocket connection, reconnection, and state sync
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Client, Room } from 'colyseus.js';
import type { GameSetup, ActionOption } from '../server/types/core';

interface GameStateSnapshot {
  phase: string;
  round: number;
  revision: number;
  coreMetricName: string;
  coreMetricDescription: string;
  coreMetricValue: number;
  players: Map<string, any>;
  eventLog: Array<any>;
  messages: Array<any>;
  submitted: Map<string, boolean>;
  maxRounds: number;
  actionPointsPerRound: number;
}

interface UseGameRoomOptions {
  roomId?: string;
  userId?: string;
  role?: string;
  setup?: GameSetup;
  onStateChange?: (state: GameStateSnapshot) => void;
  onProgress?: (payload: any) => void;
}

export function useGameRoom(options: UseGameRoomOptions) {
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);

  // Store callbacks in refs to avoid re-connecting on callback changes
  const onStateChangeRef = useRef(options.onStateChange);
  const onProgressRef = useRef(options.onProgress);

  useEffect(() => {
    onStateChangeRef.current = options.onStateChange;
    onProgressRef.current = options.onProgress;
  }, [options.onStateChange, options.onProgress]);

  // Connect to room
  useEffect(() => {
    if (!options.role && !options.roomId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';
    const client = new Client(wsUrl);

    let cleanedUp = false;

    const connectToRoom = async () => {
      try {
        console.log('[useGameRoom] Connecting...', { roomId: options.roomId, role: options.role });

        const newRoom = options.roomId
          ? await client.joinById(options.roomId, {
              userId: options.userId || 'human_player',
              role: options.role,
            })
          : await client.create('game', {
              userId: options.userId || 'human_player',
              role: options.role,
              setup: options.setup,
            });

        if (cleanedUp) {
          newRoom.leave();
          return;
        }

        setRoom(newRoom);
        setConnected(true);
        setError(null);

        console.log('[useGameRoom] Connected to room:', newRoom.id);

        // Auto-sync state changes
        newRoom.onStateChange((state) => {
          const snapshot = state.toJSON() as GameStateSnapshot;
          setGameState(snapshot);
          onStateChangeRef.current?.(snapshot);
        });

        // Listen to progress events
        newRoom.onMessage('progress', (payload) => {
          console.log('[useGameRoom] Progress:', payload);
          onProgressRef.current?.(payload);
        });

        // Listen to host token (sent to first player)
        newRoom.onMessage('host_token', (payload) => {
          console.log('[useGameRoom] Received host token');
          setHostToken(payload.token);
        });

        // Listen to action options response
        newRoom.onMessage('action_options', (payload) => {
          console.log('[useGameRoom] Action options received');
          // Store in room for retrieval
          (newRoom as any)._lastActionOptions = payload.options;
        });

        // Listen to errors
        newRoom.onMessage('error', (payload) => {
          console.error('[useGameRoom] Server error:', payload);
          setError(payload.message);
        });

        // Reconnection handling
        newRoom.onError((code, message) => {
          console.error('[useGameRoom] Room error:', code, message);
          setError(message || 'Connection error');
          setConnected(false);
        });

        newRoom.onLeave((code) => {
          console.log('[useGameRoom] Left room:', code);
          setConnected(false);
          if (!cleanedUp) {
            setRoom(null);
          }
        });
      } catch (e: any) {
        if (!cleanedUp) {
          console.error('[useGameRoom] Failed to connect:', e);
          setError(e.message || 'Failed to connect');
          setConnected(false);
        }
      }
    };

    connectToRoom();

    return () => {
      cleanedUp = true;
      room?.leave();
    };
  }, [options.roomId, options.role, options.userId]);

  // Actions

  const initialize = useCallback(
    (humanRoleName: string) => {
      if (!room) throw new Error('Not connected');
      room.send('initialize', { humanRoleName });
    },
    [room]
  );

  const getActionOptions = useCallback(
    async (playerId: string, roleName: string): Promise<ActionOption[]> => {
      if (!room) throw new Error('Not connected');

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout getting action options')), 30000);

        const checkInterval = setInterval(() => {
          const options = (room as any)._lastActionOptions;
          if (options) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            delete (room as any)._lastActionOptions;
            resolve(options);
          }
        }, 100);

        room.send('get_action_options', { playerId, roleName });
      });
    },
    [room]
  );

  const submitActions = useCallback(
    (playerId: string, actions: ActionOption[]) => {
      if (!room) throw new Error('Not connected');
      room.send('submit_actions', { playerId, actions });
    },
    [room]
  );

  const advanceRound = useCallback(
    async (context: any): Promise<void> => {
      if (!room) throw new Error('Not connected');
      if (!hostToken) throw new Error('Not host');

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout advancing round')), 60000);

        const handleAdvance = () => {
          clearTimeout(timeout);
          room.off('round_advanced', handleAdvance);
          resolve();
        };

        room.onMessage('round_advanced', handleAdvance);
        room.send('advance_round', { hostToken, context });
      });
    },
    [room, hostToken]
  );

  const sendChat = useCallback(
    (text: string) => {
      if (!room) throw new Error('Not connected');
      room.send('chat', { text });
    },
    [room]
  );

  const disconnect = useCallback(() => {
    room?.leave();
  }, [room]);

  return {
    // State
    gameState,
    connected,
    error,
    hostToken,
    roomId: room?.id,

    // Actions
    initialize,
    getActionOptions,
    submitActions,
    advanceRound,
    sendChat,
    disconnect,

    // Raw room (for advanced usage)
    room,
  };
}
