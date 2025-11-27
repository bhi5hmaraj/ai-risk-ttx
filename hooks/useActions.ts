"use client";

import { useActionStore } from '@/stores/actionStore';

export function useActions() {
  const actionOptions = useActionStore((s) => s.actionOptions);
  const aiCompletionStatus = useActionStore((s) => s.aiCompletionStatus);
  const llmCallsThisRound = useActionStore((s) => s.llmCallsThisRound);
  const isGeneratingOptions = useActionStore((s) => s.isGeneratingOptions);
  const setActionOptions = useActionStore((s) => s.setActionOptions);
  const setAICompletionStatus = useActionStore((s) => s.setAICompletionStatus);
  const updateAICompletion = useActionStore((s) => s.updateAICompletion);
  const incrementLLMCalls = useActionStore((s) => s.incrementLLMCalls);
  const setIsGeneratingOptions = useActionStore((s) => s.setIsGeneratingOptions);
  const resetRound = useActionStore((s) => s.resetRound);

  return {
    actionOptions,
    aiCompletionStatus,
    llmCallsThisRound,
    isGeneratingOptions,
    setActionOptions,
    setAICompletionStatus,
    updateAICompletion,
    incrementLLMCalls,
    setIsGeneratingOptions,
    resetRound,
  } as const;
}

