"use client";

import { useSessionStore } from '@/stores/sessionStore';

/**
 * Hook for accessing session store.
 *
 * NOTE: SSE handling is done by SessionMonitor component (mounted in layout.tsx).
 * This hook no longer subscribes to SSE to avoid duplicate subscriptions and race conditions.
 * (Phase 0.3: Removed duplicate SSE effect - MIGRATION_STATUS.md line 409)
 */
export function useSession() {
  const sessionMeta = useSessionStore((s) => s.sessionMeta);
  const setSessionMeta = useSessionStore((s) => s.setSessionMeta);
  const clear = useSessionStore((s) => s.clear);

  return { sessionMeta, setSessionMeta, clear } as const;
}
