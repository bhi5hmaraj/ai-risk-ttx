'use client';

import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useUIStore } from '@/stores/uiStore';
import { useActionStore } from '@/stores/actionStore';
import type { GameState, ActionOption, GameSetup } from '@/types';

/**
 * SessionMonitor - Sets up SSE connection to backend for real-time game updates
 * This component must be mounted at the root level to maintain the SSE connection
 */
export function SessionMonitor() {
  const { sessionMeta } = useSessionStore();
  const setSessionMeta = useSessionStore((s) => s.setSessionMeta);
  const setGameState = useGameStore((s) => s.setGameState);
  const setPlayers = useGameStore((s) => s.setPlayers);
  const players = useGameStore((s) => s.players);
  const setGameSetup = useLobbyStore((s) => s.setGameSetup);
  const setStartStep = useUIStore((s) => s.setStartStep);
  const setLoading = useUIStore((s) => s.setLoading);
  const setError = useUIStore((s) => s.setError);
  const setActionOptions = useActionStore((s) => s.setActionOptions);
  const setAICompletionStatus = useActionStore((s) => s.setAICompletionStatus);
  const updateAICompletion = useActionStore((s) => s.updateAICompletion);
  const sessionStreamRef = useRef<EventSource | null>(null);

  useEffect(() => {
    console.log('[SSE] SessionMonitor useEffect triggered - sessionMeta:', sessionMeta);

    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      console.log('[SSE] window or EventSource undefined');
      return;
    }

    if (!sessionMeta?.id) {
      console.log('[SSE] No sessionMeta.id, closing any existing stream');
      if (sessionStreamRef.current) {
        sessionStreamRef.current.close();
        sessionStreamRef.current = null;
      }
      return;
    }

    if (sessionStreamRef.current) {
      console.log('[SSE] Closing existing stream');
      sessionStreamRef.current.close();
      sessionStreamRef.current = null;
    }

    console.log('[SSE] Opening new stream for session:', sessionMeta.id);
    const source = new EventSource(`/api/session/${sessionMeta.id}/stream`);
    sessionStreamRef.current = source;

    const handleSessionEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        const snapshot = payload?.snapshot;
        if (!snapshot) return;

        console.log('[SSE] event', payload?.type || 'snapshot', 'rev=', snapshot.revision, 'round=', snapshot.state?.round);

        if (snapshot.state) {
          setGameState(snapshot.state as GameState);
        }
        if (snapshot.setup) {
          setGameSetup(snapshot.setup as GameSetup);
        }

        const submitted = snapshot.submitted ?? {};
        const serverPlayers: Array<{
          id?: string;
          role?: { name: string };
          actions?: ActionOption[];
          hasSubmittedActions?: boolean;
          hiddenScore?: number;
          actionPoints?: number;
        }> = (snapshot.players as any) ?? [];

        setPlayers((prev) => {
          if (prev.length === 0) return prev; // keep FE role icons; initial hydration happens elsewhere
          return prev.map((p) => {
            const match = serverPlayers.find((sp) => sp.id === p.id || sp.role?.name === p.role.name);
            const serverId = match?.id ?? p.id;
            const mergedActions = Array.isArray(match?.actions) ? (match!.actions as ActionOption[]) : p.actions;
            const submittedFlag =
              typeof submitted[serverId] === 'boolean'
                ? submitted[serverId]
                : match?.hasSubmittedActions ?? p.hasSubmittedActions;
            const mergedHidden = typeof match?.hiddenScore === 'number' ? (match!.hiddenScore as number) : p.hiddenScore;
            const mergedAP = typeof match?.actionPoints === 'number' ? (match!.actionPoints as number) : p.actionPoints;
            return {
              ...p,
              actions: mergedActions,
              hasSubmittedActions: submittedFlag,
              hiddenScore: mergedHidden,
              actionPoints: mergedAP,
            };
          });
        });

        // Keep sessionMeta.revision in sync with server snapshots
        try {
          if (sessionMeta?.id) {
            setSessionMeta({ id: sessionMeta.id, revision: snapshot.revision, hostToken: sessionMeta.hostToken });
          }
        } catch {}

        const progressMeta = payload?.payload;
        if (progressMeta?.role) {
          updateAICompletion(progressMeta.role as string, true);
        }

        if (payload?.type === 'advance') {
          setAICompletionStatus({});
          setLoading(false, '');
          setError(null);
          setActionOptions([]);
          setStartStep('ready', 'done');
        }

        setStartStep('connectingStream', 'done');
      } catch (err) {
        console.warn('[SessionMonitor] SSE parse error:', err);
      }
    };

    const handleError = () => {
      console.warn('[SessionMonitor] SSE stream error, closing');
      source.close();
      if (sessionStreamRef.current === source) {
        sessionStreamRef.current = null;
      }
    };

    source.addEventListener('session', handleSessionEvent as EventListener);
    source.addEventListener('error', handleError as EventListener);

    return () => {
      source.removeEventListener('session', handleSessionEvent as EventListener);
      source.removeEventListener('error', handleError as EventListener);
      source.close();
      if (sessionStreamRef.current === source) {
        sessionStreamRef.current = null;
      }
    };
  }, [sessionMeta?.id, setGameState, setPlayers, setGameSetup, updateAICompletion, setAICompletionStatus, setLoading, setError, setActionOptions, setStartStep]);

  return null; // This component doesn't render anything
}
