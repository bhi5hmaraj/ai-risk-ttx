/**
 * Room listeners — event → store projection
 *
 * Purpose
 * - Centralize all GameRoom event handling and state projection in one place.
 * - Keep the Provider thin; this module attaches onStateChange/onMessage handlers
 *   and writes the minimal, sanitized data into Zustand stores.
 *
 * Principles
 * - Pure projection: no business logic, no timers, no navigation — only derive client state.
 * - Server authority: never “simulate” transitions; react to server messages/patches only.
 * - Small surface: add a handler only when the UI needs live data from it.
 *
 * Handled messages/patches
 * - onStateChange: phase, round, players, score
 * - 'new_round': set loading gates until options arrive
 * - 'round_result': append to event log
 * - 'current_event': update current event panel
 * - 'game_ended': set phase to END
 * - 'players_init': enrich roles and freeze taken roles in lobbyStore
 * - 'action_options': set per‑player options for the current client
 */
import type { Room } from 'colyseus.js';
import type { GameState as ColyseusGameState } from '@/server/rooms/schema/GameState';
import { GamePhase } from '@/types';
import { useGameStore } from '@/stores/gameStore';
import { useActionStore } from '@/stores/actionStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { logger } from '@/lib/clientLogger';

type Utils = {
  setState: (s: ColyseusGameState) => void;
  setPlayers: (p: Map<string, any>) => void;
  convertPlayersToMap: (ps: any) => Map<string, any>;
  syncColyseusToZustand: (s: ColyseusGameState) => void;
  onStateChange?: (s: ColyseusGameState) => void;
  setError: (e: Error) => void;
  setIsConnected: (v: boolean) => void;
  setStartIntent: (v: boolean) => void;
};

export function registerGameRoomListeners(room: Room<ColyseusGameState>, utils: Utils) {
  const { setState, setPlayers, convertPlayersToMap, syncColyseusToZustand, onStateChange, setError, setIsConnected, setStartIntent } = utils;

  // State sync
  room.onStateChange((newState) => {
    console.log('[Colyseus] State changed:', { phase: newState.phase, round: newState.round, score: newState.publicScore });
    setState(newState);
    setPlayers(convertPlayersToMap(newState.players));
    syncColyseusToZustand(newState);
    onStateChange?.(newState);
  });

  // Fine-grained player updates (MapSchema hooks) to avoid any missed patches
  try {
    const updatePlayers = () => {
      try {
        const map = convertPlayersToMap(room.state.players);
        setPlayers(map);
        logger.info('[Colyseus] players map updated', { count: map.size });
      } catch (e) {
        console.warn('[Colyseus] players map update failed', e);
      }
    };
    (room.state.players as any).onAdd?.((_p: any, _k: string) => updatePlayers());
    (room.state.players as any).onRemove?.((_p: any, _k: string) => updatePlayers());
    (room.state.players as any).onChange?.((_p: any, _k: string) => updatePlayers());
  } catch (e) {
    console.warn('[Colyseus] Failed to attach players onAdd/onRemove/onChange', e);
  }

  // Round lifecycle
  room.onMessage('new_round', () => {
    const { setIsGeneratingOptions, setActionOptions } = useActionStore.getState();
    setIsGeneratingOptions(true);
    setActionOptions([]);
  });

  room.onMessage('round_result', (logEntry: any) => {
    useGameStore.setState((prev) => ({
      gameState: { ...prev.gameState, eventLog: [...prev.gameState.eventLog, logEntry] },
    }));
  });

  room.onMessage('current_event', (event: any) => {
    useGameStore.setState((prev) => ({
      gameState: { ...prev.gameState, currentEvent: event || null },
    }));
  });

  room.onMessage('game_ended', () => {
    useGameStore.setState((prev) => ({
      gameState: { ...prev.gameState, phase: GamePhase.END },
    }));
    setStartIntent(false);
  });

  // Role options
  room.onMessage('players_init', (payload: any) => {
    try {
      const serverPlayers = payload?.players || [];
      const mapById = new Map<string, any>(serverPlayers.map((p: any) => [p.id, p]));
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
      const roles = serverPlayers.map((sp: any) => ({
        name: sp.role?.name || sp.name,
        publicObjective: sp.role?.publicObjective || '',
        hiddenObjective: sp.role?.hiddenObjective || '',
        resources: sp.role?.resources || [],
        constraints: sp.role?.constraints || [],
        icon: () => null,
        taken: Boolean(sp.isTaken),
      }));
      try { useLobbyStore.getState().setAvailableRoles(roles as any); } catch {}
      logger.info('[Colyseus] players_init applied', { rolesCount: roles.length });
    } catch (e) {
      console.warn('[Colyseus] players_init failed', e);
    }
  });

  room.onMessage('action_options', (message: any) => {
    if (message.playerId === room.sessionId) {
      const { setActionOptions } = useActionStore.getState();
      setActionOptions(message.options || []);
    }
  });

  // Error / leave
  room.onError((code, message) => {
    const err = new Error(`Room error ${code}: ${message}`);
    setError(err);
  });

  room.onLeave((_code) => {
    setIsConnected(false);
  });
}
