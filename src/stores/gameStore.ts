import { create } from 'zustand';
import type { GameState } from '../../types';

interface GameStore {
  gameState: GameState | null;
  setGameState: (newState: GameState) => void;
}

export const useGameStore = create<GameStore>()((set) => ({
  gameState: null,
  setGameState: (newState: GameState) => set({ gameState: newState }),
}));