"use client";

import { useUIStore } from '@/stores/uiStore';

export function useUI() {
  const isLoading = useUIStore((s) => s.isLoading);
  const loadingMessage = useUIStore((s) => s.loadingMessage);
  const error = useUIStore((s) => s.error);
  const setLoading = useUIStore((s) => s.setLoading);
  const setError = useUIStore((s) => s.setError);
  const setActionTreeOpen = useUIStore((s) => s.setActionTreeOpen);
  const setHistoryOpen = useUIStore((s) => s.setHistoryOpen);
  const setExpandedRound = useUIStore((s) => s.setExpandedRound);
  const resetUI = useUIStore((s) => s.reset);

  return { isLoading, loadingMessage, error, setLoading, setError, setActionTreeOpen, setHistoryOpen, setExpandedRound, resetUI } as const;
}

