import { create } from 'zustand';
import type { ActionOption } from '@/types';

interface ActionStore {
  actionOptions: ActionOption[];
  aiCompletionStatus: Record<string, boolean>;
  llmCallsThisRound: number;
  chatHistory: any[] | null;
  setActionOptions: (opts: ActionOption[]) => void;
  setAICompletionStatus: (s: Record<string, boolean>) => void;
  updateAICompletion: (roleName: string, completed: boolean) => void;
  incrementLLMCalls: () => void;
  resetRound: () => void;
}

export const useActionStore = create<ActionStore>((set) => ({
  actionOptions: [],
  aiCompletionStatus: {},
  llmCallsThisRound: 0,
  chatHistory: null,
  setActionOptions: (opts) => set({ actionOptions: opts }),
  setAICompletionStatus: (s) => set({ aiCompletionStatus: s }),
  updateAICompletion: (role, done) =>
    set((state) => ({ aiCompletionStatus: { ...state.aiCompletionStatus, [role]: done } })),
  incrementLLMCalls: () => set((s) => ({ llmCallsThisRound: s.llmCallsThisRound + 1 })),
  resetRound: () => set({ actionOptions: [], aiCompletionStatus: {}, llmCallsThisRound: 0, chatHistory: null }),
}));

