'use client';

import { useEffect, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useSessionStore } from '@/stores/sessionStore';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useUIStore } from '@/stores/uiStore';
import { useActionStore } from '@/stores/actionStore';
import { SSEMetricsTracker } from '@/lib/observability';
import type { GameState, ActionOption, GameSetup } from '@/types';

/**
 * SessionMonitor - Sets up SSE connection to backend for real-time game updates
 * This component must be mounted at the root level to maintain the SSE connection
 *
 * Uses @microsoft/fetch-event-source for automatic reconnection with exponential backoff
 * Includes comprehensive observability via SSEMetricsTracker
 */
export function SessionMonitor() {
  const { sessionMeta } = useSessionStore();
  const setSessionMeta = useSessionStore((s) => s.setSessionMeta);
  const setSSEState = useSessionStore((s) => s.setSSEState);
  const setSSEEvent = useSessionStore((s) => s.setSSEEvent);
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

  // Store AbortController to cancel fetch-event-source connection
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track SSE connection metrics
  const metricsTrackerRef = useRef<SSEMetricsTracker | null>(null);

  useEffect(() => {
    console.log('[SSE] SessionMonitor useEffect triggered - sessionMeta:', sessionMeta);
    console.log('[SSE] Timestamp:', new Date().toISOString());

    if (typeof window === 'undefined') {
      console.log('[SSE] window undefined (SSR)');
      return;
    }

    if (!sessionMeta?.id) {
      console.log('[SSE] No sessionMeta.id, aborting any existing stream');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setSSEState('disconnected');
      return;
    }

    // Close existing connection if any
    if (abortControllerRef.current) {
      console.log('[SSE] Aborting existing stream for session:', sessionMeta.id);
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    console.log('[SSE] Opening new stream for session:', sessionMeta.id);
    console.log('[SSE] Connection start timestamp:', Date.now());
    setSSEState('connecting');

    // Initialize metrics tracker
    metricsTrackerRef.current = new SSEMetricsTracker(sessionMeta.id);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const handleSessionEvent = (event: { data: string; event?: string; id?: string }) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        const snapshot = payload?.snapshot;
        if (!snapshot) {
          console.warn('[SSE] Received event with no snapshot:', event.data?.substring(0, 100));
          return;
        }

        const eventType = payload?.type || 'snapshot';
        const connectionTime = Date.now();
        console.log('[SSE] ✅ EVENT RECEIVED:', {
          type: eventType,
          revision: snapshot.revision,
          round: snapshot.state?.round,
          phase: snapshot.state?.phase,
          timestamp: connectionTime,
          scenarioTitle: snapshot.setup?.scenarioTitle?.substring(0, 30)
        });

        // Mark SSE as connected when we receive first event
        setSSEState('connected');
        setSSEEvent(eventType);

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
        // CRITICAL: Don't update revision during ACTION phase to prevent race conditions
        // when user is submitting actions. The submitActions response will update the revision.
        try {
          if (sessionMeta?.id) {
            const phase = snapshot.state?.phase;
            const isActionPhase = phase === 2; // GamePhase.ACTION
            if (!isActionPhase) {
              setSessionMeta({ id: sessionMeta.id, revision: snapshot.revision, hostToken: sessionMeta.hostToken });
              console.log('[SSE] Updated sessionMeta.revision to', snapshot.revision, '(phase:', phase, ')');
            } else {
              console.log('[SSE] Skipping revision update during ACTION phase (revision:', snapshot.revision, ')');
            }
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

    // Start fetchEventSource connection with automatic reconnection
    fetchEventSource(`/api/session/${sessionMeta.id}/stream`, {
      signal: abortController.signal,

      async onopen(response) {
        if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
          console.log('[SSE] ✅ Stream opened successfully');
          setSSEState('connected');
          return; // Success - connection established
        } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          // Client error (4xx except 429) - don't retry
          console.error('[SSE] ❌ Client error, will not retry:', response.status, response.statusText);
          throw new Error(`Client error: ${response.status} ${response.statusText}`);
        } else {
          // Server error or 429 - will retry with backoff
          console.warn('[SSE] ⚠️ Server error, will retry:', response.status, response.statusText);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      },

      onmessage(event) {
        // Track event in metrics
        metricsTrackerRef.current?.trackEvent(event.event || 'unknown');

        // Handle different event types
        if (event.event === 'session') {
          handleSessionEvent(event);
        } else if (event.event === 'ping') {
          // Heartbeat - update connection status to show connection is alive
          console.log('[SSE] 💓 Heartbeat received');
          setSSEState('connected');
          setSSEEvent('💓'); // Update status pill to show heartbeat
        } else if (event.event === 'error') {
          console.error('[SSE] ❌ Error event from server:', event.data);
          setSSEState('error', 'Server error');
          metricsTrackerRef.current?.setState('error', 'Server sent error event');
        }
      },

      onerror(err) {
        // This is called for network errors and other issues
        // fetchEventSource will automatically retry with exponential backoff
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn('[SSE] ⚠️ Connection error, will auto-retry:', errorMsg);

        setSSEState('connecting', 'Reconnecting...');
        metricsTrackerRef.current?.setState('reconnecting', errorMsg);

        // Return retry interval in ms (exponential backoff)
        // Start with 1s, library will increase on subsequent failures
        return 1000;
      },

      onclose() {
        // Called when connection is closed by server
        console.log('[SSE] 🔌 Stream closed by server');
        setSSEState('disconnected');
        metricsTrackerRef.current?.setState('disconnected', 'Server closed connection');
      },

      // Keep connection alive when tab is hidden
      openWhenHidden: true,
    }).catch((err) => {
      // Final error if connection fails permanently
      if (err.name !== 'AbortError') {
        console.error('[SSE] ❌ Fatal error:', err);
        setSSEState('error', err.message || 'Connection failed');
      }
    });

    // Cleanup on unmount or sessionMeta change
    return () => {
      console.log('[SSE] Cleaning up stream');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setSSEState('disconnected');
    };
  }, [
    sessionMeta?.id,
    setSessionMeta,
    setGameState,
    setPlayers,
    setGameSetup,
    updateAICompletion,
    setAICompletionStatus,
    setLoading,
    setError,
    setActionOptions,
    setStartStep,
    setSSEState,
    setSSEEvent
  ]);

  return null; // This component doesn't render anything
}
