"use client";

/**
 * ColyseusProvider — transport glue only
 *
 * Responsibilities
 * - Owns a single Colyseus Room connection for the app lifetime (connect/leave/reconnect).
 * - Exposes a minimal context API for connecting and disconnecting only (message senders live in hooks/useGameSenders).
 * - Delegates all room state/message wiring to a separate listener module (see providers/colyseusRoomListeners.ts).
 * - Does not perform lobby listing; a separate hook (hooks/useLobbyListing.ts) handles built‑in LobbyRoom discovery.
 *
 * Non‑Responsibilities
 * - No game rules/business logic — server remains authoritative.
 * - No state shape decisions — Zustand stores are the single client projection.
 * - No heavy UI decisions — components read from stores; provider just updates them.
 *
 * Why this split
 * - Keeps transport lifecycle (attach/detach listeners, join/leave) separate from state handling.
 * - Avoids SSR/HMR pitfalls of putting sockets inside stores; provider mounts in client only.
 * - Makes testing easier: listeners can be unit‑tested against fake Room events.
 */

import { logger } from '@/lib/clientLogger';

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
import { joinGameRoom, leaveRoom as colyseusLeaveRoom, reconnectToRoom } from '@/services/colyseusClient';
import { MapSchema } from '@colyseus/schema';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useActionStore } from '@/stores/actionStore';
import { schemaToCore, schemaPlayersToCore } from '@/server/rooms/adapters/stateAdapter';
import { GamePhase, type RoleData } from '@/types';

/**
 * Convert server player data (with string emoji icons) to RoleData (with React icon components)
 * Same logic as mapStakeholdersToRoles in LobbyScreen
 */
function convertServerPlayersToRoles(serverPlayers: any[]): RoleData[] {
    return serverPlayers.map((player) => {
        // Extract emoji from either player.icon or player.role.icon
        const emoji = typeof player.icon === 'string' ? player.icon : player.role?.icon || '❓';

        // Create React icon component from emoji string
        const iconComponent = (props: React.SVGProps<SVGSVGElement>) => (
            <span className="text-2xl" role="img" aria-label="role icon">
                {emoji}
            </span>
        );

        return {
            name: player.role?.name || player.name,
            publicObjective: player.role?.publicObjective || '',
            hiddenObjective: player.role?.hiddenObjective || '',
            resources: player.role?.resources || [],
            constraints: player.role?.constraints || [],
            icon: iconComponent,
            taken: Boolean(player.isTaken),
        };
    });
}

export interface ColyseusContextValue {
    room: Room<ColyseusGameState> | null;
    state: ColyseusGameState | null;
    players: Map<string, ColyseusPlayer> | null;
    sessionId: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    error: Error | null;
    connect: (options: { name: string; role: string; isHuman?: boolean; gameId?: string; isHost?: boolean }) => Promise<void>;
    disconnect: () => Promise<void>;
    // no client-side advance; server is authoritative
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
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const roomRef = useRef<Room<ColyseusGameState> | null>(null);
    const connectInFlightRef = useRef(false);

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

    const connect = useCallback(async (options: { name: string; role: string; isHuman?: boolean; gameId?: string; isHost?: boolean }) => {
        if (roomRef.current || isConnecting || connectInFlightRef.current) {
            console.log('[ColyseusProvider] Already connected or connecting');
            return;
        }

        connectInFlightRef.current = true;
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
                isHost: options.isHost === true,
            });

            roomRef.current = newRoom;
            setRoom(newRoom);
            setSessionId(newRoom.sessionId || null);
            try { useSessionStore.getState().setColyseusSessionId(newRoom.sessionId || null); } catch {}
            setIsConnected(true);

            // Seed initial state before first onStateChange triggers
            try {
                setState(newRoom.state as any);
                const initialPlayers = convertPlayersToMap((newRoom.state as any).players as any);
                setPlayers(initialPlayers);
                syncColyseusToZustand(newRoom.state as any);
            } catch (e) {
                console.warn('[ColyseusProvider] Failed to seed initial state', e);
            }

            // Store reconnection token
            if (newRoom.reconnectionToken) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('colyseus_reconnection_token', newRoom.reconnectionToken);
                    localStorage.setItem('colyseus_room_id', newRoom.roomId || '');
                }
            }

            // Delegate message/state wiring to a separate module for clarity
            const { registerGameRoomListeners } = await import('./colyseusRoomListeners');
            registerGameRoomListeners(newRoom as any, {
                setState,
                setPlayers,
                convertPlayersToMap,
                syncColyseusToZustand,
                onStateChange,
                setError,
                setIsConnected,
                setStartIntent,
            });

            // Ensure roles arrive even if initial broadcast was missed
            try { (newRoom as any).send('request_roles'); } catch {}

            // Optional: server may broadcast 'game_started'. We no longer navigate here.
            newRoom.onMessage('game_started', () => {
                console.log('[ColyseusProvider] Game started! (no redirect)');
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
                try { useSessionStore.getState().setColyseusSessionId(null); } catch {}
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
            connectInFlightRef.current = false;
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

    // Auto-reconnect once on mount using stored reconnection token (SPA flow)
    const autoReconnectAttempted = useRef(false);
    useEffect(() => {
        if (autoReconnectAttempted.current) return;
        autoReconnectAttempted.current = true;

        // Browser-only
        if (typeof window === 'undefined') return;
        const token = localStorage.getItem('colyseus_reconnection_token');
        if (!token) return;

        // Don't attempt if already connected/connecting
        if (roomRef.current || isConnecting) return;

        let cancelled = false;
        (async () => {
            try {
                setIsConnecting(true);
                setError(null);

                const newRoom = await reconnectToRoom(token);
                if (cancelled) return;

                roomRef.current = newRoom as any;
                setRoom(newRoom as any);
                setSessionId(newRoom.sessionId || null);
                try { useSessionStore.getState().setColyseusSessionId(newRoom.sessionId || null); } catch {}
                setIsConnected(true);

                // Seed initial state on reconnect
                try {
                    setState(newRoom.state as any);
                    const initialPlayers = convertPlayersToMap((newRoom.state as any).players as any);
                    setPlayers(initialPlayers);
                    syncColyseusToZustand(newRoom.state as any);
                } catch (e) {
                    console.warn('[ColyseusProvider] Failed to seed initial state (reconnect)', e);
                }

                // Refresh reconnection token if available
                if ((newRoom as any).reconnectionToken) {
                    localStorage.setItem('colyseus_reconnection_token', (newRoom as any).reconnectionToken);
                    localStorage.setItem('colyseus_room_id', newRoom.roomId || '');
                }

                const { registerGameRoomListeners } = await import('./colyseusRoomListeners');
                registerGameRoomListeners(newRoom as any, {
                    setState,
                    setPlayers,
                    convertPlayersToMap,
                    syncColyseusToZustand,
                    onStateChange,
                    setError,
                    setIsConnected,
                    setStartIntent,
                });

                // Ensure roles arrive after reconnect as well
                try { (newRoom as any).send('request_roles'); } catch {}

                // Mirror connect() handlers
                newRoom.onMessage('game_started', () => {
                    console.log('[ColyseusProvider] Game started! (auto-reconnect)');
                    const { setIsGeneratingOptions } = useActionStore.getState();
                    setIsGeneratingOptions(true);
                });

                newRoom.onMessage('action_options', (message: any) => {
                    if (message.playerId === newRoom.sessionId) {
                        const { setActionOptions } = useActionStore.getState();
                        setActionOptions(message.options || []);
                    }
                });

                newRoom.onError((code, message) => {
                    console.error('[ColyseusProvider] Room error (reconnect):', code, message);
                    const err = new Error(`Room error ${code}: ${message}`);
                    setError(err);
                    onError?.(err);
                });

                newRoom.onLeave((code) => {
                    console.log('[ColyseusProvider] Left room (reconnect path) with code:', code);
                    setIsConnected(false);
                    roomRef.current = null;
                    setRoom(null);
                    try { useSessionStore.getState().setColyseusSessionId(null); } catch {}
                });

                console.log('[ColyseusProvider] Auto-reconnected successfully', { roomId: newRoom.roomId, sessionId: newRoom.sessionId });
            } catch (err) {
                console.warn('[ColyseusProvider] Auto-reconnect failed; clearing token', err);
                try {
                    localStorage.removeItem('colyseus_reconnection_token');
                    localStorage.removeItem('colyseus_room_id');
                } catch {}
                setIsConnected(false);
            } finally {
                if (!cancelled) setIsConnecting(false);
            }
        })();

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cleanup only on app unmount (not on route changes!)
    useEffect(() => {
        return () => {
            if (roomRef.current) {
                console.log('[ColyseusProvider] App unmounting, cleaning up connection');
                roomRef.current.removeAllListeners();
                colyseusLeaveRoom(roomRef.current).catch(console.error);
                try {
                    // Clear reconnection tokens on graceful shutdown to avoid invalid/expired reconnect attempts on reload
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('colyseus_reconnection_token');
                        localStorage.removeItem('colyseus_room_id');
                    }
                } catch {}
            }
        };
    }, []);

    const value: ColyseusContextValue = {
        room,
        state,
        players,
        sessionId,
        isConnected,
        isConnecting,
        error,
        connect,
        disconnect,
    };

    return <ColyseusContext.Provider value={value}>{children}</ColyseusContext.Provider>;
}
