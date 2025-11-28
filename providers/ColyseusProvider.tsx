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
import { useLobbyStore } from '@/stores/lobbyStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useActionStore } from '@/stores/actionStore';
import { schemaToCore, schemaPlayersToCore } from '@/server/rooms/adapters/stateAdapter';
import { GamePhase } from '@/types';

export interface ColyseusContextValue {
    room: Room<ColyseusGameState> | null;
    state: ColyseusGameState | null;
    players: Map<string, ColyseusPlayer> | null;
    isConnected: boolean;
    isConnecting: boolean;
    error: Error | null;
    connect: (options: { name: string; role: string; isHuman?: boolean; gameId?: string }) => Promise<void>;
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
        // Preserve rich fields managed outside Schema (eventLog/currentEvent)
        const prevGameState = useGameStore.getState().gameState;
        const prevPlayers = useGameStore.getState().players;

        const coreGameState = schemaToCore(colyseusState, {
            eventLog: prevGameState.eventLog,
            currentEvent: prevGameState.currentEvent,
        });

        // Build enrichment map to preserve role data (hiddenObjective, etc.) from previous state
        // This prevents losing enriched data from players_init message
        const enrichment = new Map<string, { fullRole?: any; actions?: any; hiddenScore?: number }>();
        prevPlayers.forEach((prevPlayer) => {
            // Preserve the enriched role data if it exists
            if (prevPlayer.role.hiddenObjective || prevPlayer.role.publicObjective) {
                enrichment.set(prevPlayer.id, {
                    fullRole: prevPlayer.role,
                    actions: prevPlayer.actions,
                    hiddenScore: prevPlayer.hiddenScore,
                });
            }
        });

        const corePlayers = schemaPlayersToCore(colyseusState.players, enrichment);

        // Update Zustand stores (cast to client types - client Player has icon field in RoleData)
        setGameState(coreGameState as any);
        setGamePlayers(corePlayers as any);

        console.log('[ColyseusProvider] Synced to Zustand:', {
            phase: coreGameState.phase,
            round: coreGameState.round,
            playerCount: corePlayers.length,
        });
    }, [setGameState, setGamePlayers]);

    const connect = useCallback(async (options: { name: string; role: string; isHuman?: boolean; gameId?: string }) => {
        if (roomRef.current || isConnecting) {
            console.log('[ColyseusProvider] Already connected or connecting');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            // Pull latest lobby state at call time (not at component mount)
            const lobby = useLobbyStore.getState();
            const newRoom = await joinGameRoom({
                name: options.name,
                role: options.role,
                isHuman: options.isHuman ?? true,
                gameId: options.gameId, // Room code for multiplayer joining
                // Pass scenario-derived setup so server can seed roles/players
                gameSetup: lobby.gameSetup || null,
                maxRounds: lobby.maxRounds,
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
                // Show loading while server generates next-round action options
                const { setIsGeneratingOptions, setActionOptions } = useActionStore.getState();
                setIsGeneratingOptions(true);
                setActionOptions([]);
            });

            // Receive round_result: append to local eventLog so UI can display Key Moments / Score Δ
            newRoom.onMessage('round_result', (logEntry: any) => {
                console.log('[ColyseusProvider] Round result received:', {
                    round: logEntry?.round,
                    delta: logEntry?.publicScoreChange,
                    timeline: logEntry?.outcomeTimeline?.length,
                });
                // Append into game store's eventLog without disturbing other fields
                useGameStore.setState((prev) => ({
                    gameState: {
                        ...prev.gameState,
                        eventLog: [...prev.gameState.eventLog, logEntry],
                    },
                }));
            });

            // Receive current_event: set currentEvent in store for "Current Event" panel
            newRoom.onMessage('current_event', (event: any) => {
                console.log('[ColyseusProvider] Current event received:', event);
                useGameStore.setState((prev) => ({
                    gameState: {
                        ...prev.gameState,
                        currentEvent: event || null,
                    },
                }));
            });

            // Receive game_ended: set phase to END so RouteOrchestrator navigates to /end
            newRoom.onMessage('game_ended', (_payload: any) => {
                console.log('[ColyseusProvider] Game ended');
                useGameStore.setState((prev) => ({
                    gameState: {
                        ...prev.gameState,
                        phase: GamePhase.END,
                    },
                }));
                // Clear start intent so RouteOrchestrator doesn't try to navigate back to /game
                setStartIntent(false);
            });

            // Receive players_init: enrich client-side roles with objectives from scenario
            newRoom.onMessage('players_init', (payload: any) => {
                try {
                    const mapById = new Map<string, any>((payload?.players || []).map((p: any) => [p.id, p]));
                    useGameStore.setState((prev) => ({
                        players: prev.players.map((p) => {
                            const info = mapById.get((p as any).id) || mapById.get(p.role.name);
                            if (!info) return p;
                            return {
                                ...p,
                                role: {
                                    ...p.role,
                                    publicObjective: info.role?.publicObjective ?? p.role.publicObjective,
                                    hiddenObjective: info.role?.hiddenObjective ?? p.role.hiddenObjective,
                                    resources: info.role?.resources ?? p.role.resources,
                                    constraints: info.role?.constraints ?? p.role.constraints,
                                },
                            } as any;
                        }),
                    }));
                    console.log('[ColyseusProvider] players_init applied');
                } catch (e) {
                    console.warn('[ColyseusProvider] players_init failed:', e);
                }
            });

            newRoom.onMessage('all_submitted', () => {
                console.log('[ColyseusProvider] All players submitted actions - auto-advancing round');
                // Auto-advance to next round when all players have submitted
                newRoom.send('advance_round', {});
            });

            newRoom.onMessage('game_started', () => {
                console.log('[ColyseusProvider] Game started!');
                // Set start intent so RouteOrchestrator navigates to /game
                setStartIntent(true);

                // Set loading flag while waiting for action options from server
                const { setIsGeneratingOptions } = useActionStore.getState();
                setIsGeneratingOptions(true);
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
            throw error;
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
