"use client";

import { useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useGameStore } from '@/stores/gameStore';
import { SessionService } from '@/services/SessionService';

export function useSession() {
  const sessionMeta = useSessionStore((s) => s.sessionMeta);
  const isBackendMode = useSessionStore((s) => s.isBackendMode);
  const setSessionMeta = useSessionStore((s) => s.setSessionMeta);
  const clear = useSessionStore((s) => s.clear);
  const setGameState = useGameStore((s) => s.setGameState);
  const setPlayers = useGameStore((s) => s.setPlayers);

  useEffect(() => {
    if (!isBackendMode || !sessionMeta?.id) return;
    const source = SessionService.createEventSource(sessionMeta.id);

    const onEvent = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data || '{}');
        const snapshot = payload?.snapshot;
        if (!snapshot) return;
        setSessionMeta({ id: sessionMeta.id, revision: snapshot.revision, hostToken: sessionMeta.hostToken });
        if (snapshot.state) setGameState(snapshot.state as any);
        if (snapshot.players) {
          setPlayers((prev) => {
            if (prev.length === 0) return prev;
            const submitted = snapshot.submitted ?? {};
            return prev.map((p) => ({ ...p, hasSubmittedActions: submitted[p.id] ?? p.hasSubmittedActions }));
          });
        }
      } catch {}
    };
    source.addEventListener('session', onEvent as any);

    return () => {
      source.removeEventListener('session', onEvent as any);
      source.close();
    };
  }, [isBackendMode, sessionMeta?.id]);

  return { sessionMeta, isBackendMode, setSessionMeta, clear } as const;
}

