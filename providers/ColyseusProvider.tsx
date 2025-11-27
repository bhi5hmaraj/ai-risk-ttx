"use client";

/**
 * ColyseusProvider - Global Colyseus Connection Manager
 *
 * This provider wraps the entire app and maintains a persistent Colyseus
 * connection that survives page navigation. It exposes the connection via
 * React Context so any component can access it.
 *
 * Key Features:
 * - Persists connection across route changes
 * - Stores reconnection token in localStorage
 * - Provides connection state to all components
 * - Handles cleanup only on app unmount
 */

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Room } from 'colyseus.js';
import type { GameState as ColyseusGameState, Player as ColyseusPlayer } from '@/server/rooms/schema/GameState';
import { joinGameRoom, leaveRoom as colyseusLeaveRoom } from '@/services/colyseusClient';
import { MapSchema } from '@colyseus/schema';
import { useGameStore } from '@/stores/gameStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useActionStore } from '@/stores/actionStore';
import { schemaToCore, schemaPlayersToCore } from '@/server/rooms/adapters/stateAdapter';

export interface ColyseusContextValue {
    room: Room<ColyseusGameState> | null;
    state: ColyseusGameState | null;
    players: Map<string, ColyseusPlayer> | null;
    isConnected: boolean;
    isConnecting: boolean;
    error: Error | null;
    connect: (options: { name: string; role: string; isHuman?: boolean }) => Promise<void>;
    disconnect: () => Promise<void>;
    setRole: (role: string, name?: string) => void;
    submitAction: (actionId: string, cost: number) => void;
    startGame: () => void;
    advanceRound: () => void;
}

const ColyseusContext = createContext<ColyseusContextValue | null>(null);

export function useColyseus() {
    const context = useContext(ColyseusContext);
    if (!context) {
        throw new Error('useColyseus must be used within ColyseusProvider');
    }
    return context;
}

interface ColyseusProviderProps {
    children: React.ReactNode;
    onStateChange?: (state: ColyseusGameState) => void;
    onError?: (error: Error) => void;
}

export function ColyseusProvider({ children, onStateChange, onError }: ColyseusProviderProps) {
    const [room, setRoom] = useState<Room<ColyseusGameState> | null>(null);
    const [state, setState] = useState<ColyseusGameState | null>(null);
    const [players, setPlayers] = useState<Map<string, ColyseusPlayer> | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const roomRef = useRef<Room<ColyseusGameState> | null>(null);

    // Zustand stores for syncing Colyseus state to UI
    const { setGameState, setPlayers: setGamePlayers } = useGameStore();
    const { setStartIntent } = useSessionStore();

    // Convert MapSchema to Map
    const convertPlayersToMap = useCallback((playersSchema: MapSchema<ColyseusPlayer>): Map<string, ColyseusPlayer> => {
        const map = new Map<string, ColyseusPlayer>();
        playersSchema.forEach((player, key) => {
            map.set(key, player);
        });
        return map;
    }, []);

    // Sync Colyseus state to Zustand stores (Architecture: room.state.onChange → Zustand updates)
    const syncColyseusToZustand = useCallback((colyseusState: ColyseusGameState) => {
        // Use existing server adapters to convert Schema → Core
        const coreGameState = schemaToCore(colyseusState, {
            eventLog: [], // eventLog is not synced via Colyseus (lives in StateManager)
            currentEvent: null, // currentEvent is not synced via Colyseus
        });

        const corePlayers = schemaPlayersToCore(colyseusState.players);

        // Update Zustand stores (cast to client types - client Player has icon field in RoleData)
        setGameState(coreGameState as any);
        setGamePlayers(corePlayers as any);

        console.log('[ColyseusProvider] Synced to Zustand:', {
            phase: coreGameState.phase,
            round: coreGameState.round,
            playerCount: corePlayers.length,
        });
    }, [setGameState, setGamePlayers]);

    const connect = useCallback(async (options: { name: string; role: string; isHuman?: boolean }) => {
        if (roomRef.current || isConnecting) {
            console.log('[ColyseusProvider] Already connected or connecting');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            const newRoom = await joinGameRoom({
                name: options.name,
                role: options.role,
                isHuman: options.isHuman ?? true,
            });

            roomRef.current = newRoom;
            setRoom(newRoom);
            setIsConnected(true);

            // Store reconnection token
            if (newRoom.reconnectionToken) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('colyseus_reconnection_token', newRoom.reconnectionToken);
                    localStorage.setItem('colyseus_room_id', newRoom.roomId || '');
                }
            }

            // Set up state change listener
            newRoom.onStateChange((newState) => {
                console.log('[ColyseusProvider] State changed:', {
                    phase: newState.phase,
                    round: newState.round,
                    publicScore: newState.publicScore,
                });
                setState(newState);
                setPlayers(convertPlayersToMap(newState.players));

                // Sync to Zustand stores (Architecture: room.state.onChange → Zustand updates)
                syncColyseusToZustand(newState);

                onStateChange?.(newState);
            });

            // Set up message listeners
            newRoom.onMessage('new_round', (message: any) => {
                console.log('[ColyseusProvider] New round:', message);
            });

            newRoom.onMessage('all_submitted', () => {
                console.log('[ColyseusProvider] All players submitted actions');
            });

            newRoom.onMessage('game_started', () => {
                console.log('[ColyseusProvider] Game started!');
                // Set start intent so RouteOrchestrator navigates to /game
                setStartIntent(true);
            });

            newRoom.onMessage('action_options', (message: any) => {
                console.log('[ColyseusProvider] Received action options:', {
                    playerId: message.playerId,
                    round: message.round,
                    optionCount: message.options?.length || 0
                });

                // Only process if this is for the current client
                if (message.playerId === newRoom.sessionId) {
                    // Update Zustand action store with new options
                    const { setActionOptions } = useActionStore.getState();
                    setActionOptions(message.options || []);
                    console.log('[ColyseusProvider] Updated action options in store');
                }
            });

            // Error handling
            newRoom.onError((code, message) => {
                console.error('[ColyseusProvider] Room error:', code, message);
                const err = new Error(`Room error ${code}: ${message}`);
                setError(err);
                onError?.(err);
            });

            // Leave handling
            newRoom.onLeave((code) => {
                console.log('[ColyseusProvider] Left room with code:', code);
                setIsConnected(false);
                roomRef.current = null;
                setRoom(null);
            });

            console.log('[ColyseusProvider] Connected successfully!', {
                roomId: newRoom.roomId,
                sessionId: newRoom.sessionId,
            });
        } catch (err) {
            console.error('[ColyseusProvider] Connection failed:', err);
            const error = err instanceof Error ? err : new Error('Connection failed');
            setError(error);
            onError?.(error);
            setIsConnected(false);
        } finally {
            setIsConnecting(false);
        }
    }, [isConnecting, convertPlayersToMap, syncColyseusToZustand, setStartIntent, onStateChange, onError]);

    const disconnect = useCallback(async () => {
        if (roomRef.current) {
            try {
                roomRef.current.removeAllListeners();
                await colyseusLeaveRoom(roomRef.current);
                roomRef.current = null;
                setRoom(null);
                setIsConnected(false);

                if (typeof window !== 'undefined') {
                    localStorage.removeItem('colyseus_reconnection_token');
                    localStorage.removeItem('colyseus_room_id');
                }
            } catch (err) {
                console.error('[ColyseusProvider] Disconnect error:', err);
            }
        }
    }, []);

    // Message sending helpers
    const setRole = useCallback((role: string, name?: string) => {
        if (roomRef.current) {
            roomRef.current.send('set_role', { role, name });
        }
    }, []);

    const submitAction = useCallback((actionId: string, cost: number) => {
        if (roomRef.current) {
            roomRef.current.send('submit_action', { actionId, cost });
        }
    }, []);

    const startGame = useCallback(() => {
        if (roomRef.current) {
            roomRef.current.send('start_game', {});
        }
    }, []);

    const advanceRound = useCallback(() => {
        if (roomRef.current) {
            roomRef.current.send('advance_round', {});
        }
    }, []);

    // Cleanup only on app unmount (not on route changes!)
    useEffect(() => {
        return () => {
            if (roomRef.current) {
                console.log('[ColyseusProvider] App unmounting, cleaning up connection');
                roomRef.current.removeAllListeners();
                colyseusLeaveRoom(roomRef.current).catch(console.error);
            }
        };
    }, []);

    const value: ColyseusContextValue = {
        room,
        state,
        players,
        isConnected,
        isConnecting,
        error,
        connect,
        disconnect,
        setRole,
        submitAction,
        startGame,
        advanceRound,
    };

    return <ColyseusContext.Provider value={value}>{children}</ColyseusContext.Provider>;
}
