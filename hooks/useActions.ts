"use client";

import { useActionStore } from '@/stores/actionStore';

export function useActions() {
  const actionOptions = useActionStore((s) => s.actionOptions);
  const aiCompletionStatus = useActionStore((s) => s.aiCompletionStatus);
  const llmCallsThisRound = useActionStore((s) => s.llmCallsThisRound);
  const setActionOptions = useActionStore((s) => s.setActionOptions);
  const setAICompletionStatus = useActionStore((s) => s.setAICompletionStatus);
  const updateAICompletion = useActionStore((s) => s.updateAICompletion);
  const incrementLLMCalls = useActionStore((s) => s.incrementLLMCalls);
  const resetRound = useActionStore((s) => s.resetRound);

  return {
    actionOptions,
    aiCompletionStatus,
    llmCallsThisRound,
    setActionOptions,
    setAICompletionStatus,
    updateAICompletion,
    incrementLLMCalls,
    resetRound,
  } as const;
}

