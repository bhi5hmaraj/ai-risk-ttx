import { create } from 'zustand';

export interface WaitingHuman { id: string; name: string; role: string; submitted: boolean }
export interface WaitingAI { id: string; role: string; done: boolean }
export interface WaitingStatus {
  round: number;
  phase: string;
  humans: WaitingHuman[];
  ai: WaitingAI[];
  humansReady: number;
  humansTotal: number;
  allHumansReady: boolean;
  allReady: boolean;
}

interface WaitingStore {
  status: WaitingStatus | null;
  setStatus: (s: WaitingStatus | null) => void;
  reset: () => void;
}

export const useWaitingStore = create<WaitingStore>((set) => ({
  status: null,
  setStatus: (s) => set({ status: s }),
  reset: () => set({ status: null }),
}));

