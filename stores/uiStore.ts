import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type StepState = 'idle' | 'running' | 'done' | 'error';
type FontSize = 'small' | 'medium' | 'large';

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
  showStartHUD: boolean;
  isSettingsOpen: boolean;
  fontSize: FontSize;
  setLoading: (isLoading: boolean, message?: string) => void;
  setError: (err: string | null) => void;
  setActionTreeOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  setExpandedRound: (round: number | null) => void;
  setStartProgress: (partial: Partial<StartProgressState>) => void;
  setStartStep: (key: keyof StartProgressState, state: StepState) => void;
  setShowStartHUD: (show: boolean) => void;
  toggleStartHUD: () => void;
  setSettingsOpen: (open: boolean) => void;
  setFontSize: (size: FontSize) => void;
  reset: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
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
      showStartHUD: false,
      isSettingsOpen: false,
      fontSize: 'medium' as FontSize,
      setLoading: (isLoading, message = '') => set({ isLoading, loadingMessage: message }),
      setError: (error) => set({ error }),
      setActionTreeOpen: (open) => set({ isActionTreeOpen: open }),
      setHistoryOpen: (open) => set({ isHistoryOpen: open, expandedRound: open ? null : undefined as any }),
      setExpandedRound: (round) => set({ expandedRound: round }),
      setStartProgress: (partial) => set((s) => ({ startProgress: { ...s.startProgress, ...partial } })),
      setStartStep: (key, state) => set((s) => ({ startProgress: { ...s.startProgress, [key]: state } })),
      setShowStartHUD: (show) => set({ showStartHUD: show }),
      toggleStartHUD: () => set((s) => ({ showStartHUD: !s.showStartHUD })),
      setSettingsOpen: (open) => set({ isSettingsOpen: open }),
      setFontSize: (fontSize) => set({ fontSize }),
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
        showStartHUD: false,
        isSettingsOpen: false,
        // fontSize is persisted, so don't reset it
      }),
    }),
    {
      name: 'simulacra-ui-settings',
      partialize: (state) => ({ fontSize: state.fontSize }),
    }
  )
);
