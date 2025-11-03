import { create } from 'zustand';
import type { GameSetup } from '@/types';

interface LobbyStore {
  selectedRoleName: string | null;
  gamePath: 'classic' | 'custom' | 'ai_safety' | null;
  gameSetup: GameSetup | null;
  customScenario: string;
  setSelectedRoleName: (name: string | null) => void;
  setGamePath: (path: LobbyStore['gamePath']) => void;
  setGameSetup: (setup: GameSetup | null) => void;
  setCustomScenario: (scenario: string) => void;
  reset: () => void;
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  selectedRoleName: null,
  gamePath: null,
  gameSetup: null,
  customScenario: '',
  setSelectedRoleName: (name) => set({ selectedRoleName: name }),
  setGamePath: (path) => set({ gamePath: path }),
  setGameSetup: (setup) => set({ gameSetup: setup }),
  setCustomScenario: (scenario) => set({ customScenario: scenario }),
  reset: () => set({ selectedRoleName: null, gamePath: null, gameSetup: null, customScenario: '' }),
}));

