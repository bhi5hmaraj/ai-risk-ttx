import { create } from 'zustand';
import type { GameState, Player, GameLogEntry, GameSetup } from '@/types';
import { GamePhase } from '@/types';

interface GameStore {
  gameState: GameState;
  players: Player[];
  gameSetup: GameSetup | null;
  humanPlayer: () => Player | null;
  latestLogEntry: () => GameLogEntry | null;
  setGameState: (state: GameState | ((prev: GameState) => GameState)) => void;
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  setGameSetup: (setup: GameSetup | ((prev: GameSetup | null) => GameSetup) | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: {
    phase: GamePhase.LOBBY,
    round: 0,
    coreMetric: { name: 'Democratic Legitimacy', description: "Public's trust", value: 100 },
    eventLog: [],
    currentEvent: null,
  },
  players: [],
  gameSetup: null,
  humanPlayer: () => get().players.find((p) => p.isHuman) ?? null,
  latestLogEntry: () => {
    const log = get().gameState.eventLog;
    return log.length > 0 ? log[log.length - 1] : null;
  },
  setGameState: (value) =>
    set((state) => ({
      gameState: typeof value === 'function' ? (value as any)(state.gameState) : value,
    })),
  setPlayers: (value) =>
    set((state) => ({
      players: typeof value === 'function' ? (value as any)(state.players) : value,
    })),
  setGameSetup: (value) =>
    set((state) => ({
      gameSetup:
        typeof value === 'function'
          ? (value as (prev: GameSetup | null) => GameSetup)(state.gameSetup)
          : (value as GameSetup | null),
    })),
  reset: () =>
    set({
      gameState: {
        phase: GamePhase.LOBBY,
        round: 0,
        coreMetric: { name: 'Democratic Legitimacy', description: "Public's trust", value: 100 },
        eventLog: [],
        currentEvent: null,
      },
      players: [],
      gameSetup: null,
    }),
}));
