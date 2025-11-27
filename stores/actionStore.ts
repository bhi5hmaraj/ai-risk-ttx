import { create } from 'zustand';
import type { ActionOption } from '@/types';

interface ActionStore {
  actionOptions: ActionOption[];
  aiCompletionStatus: Record<string, boolean>;
  llmCallsThisRound: number;
  chatHistory: any[] | null;
  isGeneratingOptions: boolean;
  setActionOptions: (opts: ActionOption[]) => void;
  setAICompletionStatus: (s: Record<string, boolean>) => void;
  updateAICompletion: (roleName: string, completed: boolean) => void;
  incrementLLMCalls: () => void;
  setIsGeneratingOptions: (generating: boolean) => void;
  resetRound: () => void;
}

export const useActionStore = create<ActionStore>((set) => ({
  actionOptions: [],
  aiCompletionStatus: {},
  llmCallsThisRound: 0,
  chatHistory: null,
  isGeneratingOptions: false,
  setActionOptions: (opts) => set({ actionOptions: opts, isGeneratingOptions: false }),
  setAICompletionStatus: (s) => set({ aiCompletionStatus: s }),
  updateAICompletion: (role, done) =>
    set((state) => ({ aiCompletionStatus: { ...state.aiCompletionStatus, [role]: done } })),
  incrementLLMCalls: () => set((s) => ({ llmCallsThisRound: s.llmCallsThisRound + 1 })),
  setIsGeneratingOptions: (generating) => set({ isGeneratingOptions: generating }),
  resetRound: () => set({ actionOptions: [], aiCompletionStatus: {}, llmCallsThisRound: 0, chatHistory: null, isGeneratingOptions: false }),
}));

