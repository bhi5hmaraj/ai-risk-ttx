import { create } from 'zustand';

type StepState = 'idle' | 'running' | 'done' | 'error';

interface StartProgressState {
  creatingSession: StepState;
  buildingPlayers: StepState;
  generatingScenario: StepState;
  connectingStream: StepState;
  ready: StepState;
}

interface UIStore {
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  isActionTreeOpen: boolean;
  isHistoryOpen: boolean;
  expandedRound: number | null;
  startProgress: StartProgressState;
  setLoading: (isLoading: boolean, message?: string) => void;
  setError: (err: string | null) => void;
  setActionTreeOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  setExpandedRound: (round: number | null) => void;
  setStartProgress: (partial: Partial<StartProgressState>) => void;
  setStartStep: (key: keyof StartProgressState, state: StepState) => void;
  reset: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isLoading: false,
  loadingMessage: '',
  error: null,
  isActionTreeOpen: false,
  isHistoryOpen: true,
  expandedRound: null,
  startProgress: {
    creatingSession: 'idle',
    buildingPlayers: 'idle',
    generatingScenario: 'idle',
    connectingStream: 'idle',
    ready: 'idle',
  },
  setLoading: (isLoading, message = '') => set({ isLoading, loadingMessage: message }),
  setError: (error) => set({ error }),
  setActionTreeOpen: (open) => set({ isActionTreeOpen: open }),
  setHistoryOpen: (open) => set({ isHistoryOpen: open, expandedRound: open ? null : undefined as any }),
  setExpandedRound: (round) => set({ expandedRound: round }),
  setStartProgress: (partial) => set((s) => ({ startProgress: { ...s.startProgress, ...partial } })),
  setStartStep: (key, state) => set((s) => ({ startProgress: { ...s.startProgress, [key]: state } })),
  reset: () => set({
    isLoading: false,
    loadingMessage: '',
    error: null,
    isActionTreeOpen: false,
    isHistoryOpen: true,
    expandedRound: null,
    startProgress: {
      creatingSession: 'idle',
      buildingPlayers: 'idle',
      generatingScenario: 'idle',
      connectingStream: 'idle',
      ready: 'idle',
    },
  }),
}));
