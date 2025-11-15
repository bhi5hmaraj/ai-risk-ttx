import { create } from 'zustand';
import type { GameSetup } from '@/types';

interface LobbyStore {
  selectedRoleName: string | null;
  gamePath: 'classic' | 'custom' | 'ai_safety' | null;
  gameSetup: GameSetup | null;
  customScenario: string;
  maxAIPlayers: number; // 0..5
  maxRounds: number;    // 1..10
  isFromPublicCatalog: boolean; // True if scenario was loaded from public catalog
  setSelectedRoleName: (name: string | null) => void;
  setGamePath: (path: LobbyStore['gamePath']) => void;
  setGameSetup: (setup: GameSetup | null) => void;
  setCustomScenario: (scenario: string) => void;
  setMaxAIPlayers: (n: number) => void;
  setMaxRounds: (n: number) => void;
  setIsFromPublicCatalog: (value: boolean) => void;
  reset: () => void;
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  selectedRoleName: null,
  gamePath: null,
  gameSetup: null,
  customScenario: '',
   maxAIPlayers: 5,
   maxRounds: 5,
  isFromPublicCatalog: false,
  setSelectedRoleName: (name) => set({ selectedRoleName: name }),
  setGamePath: (path) => set({ gamePath: path }),
  setGameSetup: (setup) => set({ gameSetup: setup }),
  setCustomScenario: (scenario) => set({ customScenario: scenario }),
  setMaxAIPlayers: (n) => set({ maxAIPlayers: Math.max(0, Math.min(5, Math.floor(n))) }),
  setMaxRounds: (n) => set({ maxRounds: Math.max(1, Math.min(10, Math.floor(n))) }),
  setIsFromPublicCatalog: (value) => set({ isFromPublicCatalog: value }),
  reset: () => set({ selectedRoleName: null, gamePath: null, gameSetup: null, customScenario: '', maxAIPlayers: 5, maxRounds: 5, isFromPublicCatalog: false }),
}));
