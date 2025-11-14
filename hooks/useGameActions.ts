"use client";

import { useCallback, useRef } from 'react';
import { GamePhase, type ActionOption } from '@/types';
import { useGame } from '@/hooks/useGame';
import { useUI } from '@/hooks/useUI';
import { useActions } from '@/hooks/useActions';
import { useLobby } from '@/hooks/useLobby';
import { useSession } from '@/hooks/useSession';
import { useUIStore } from '@/stores/uiStore';
import { SessionService } from '@/services/SessionService';
import { selectInitialPlayers, createCanonicalSetup } from '@/lib/gameSetup';
import { AI_SAFETY_SCENARIO, ELECTION_PRESET_ABOUT } from '@/presets';

export function useGameActions() {
  const { gameState, players, setGameState, setPlayers } = useGame();
  const { setLoading, setError } = useUI();
  const { actionOptions, setActionOptions } = useActions();
  const { selectedRoleName, gamePath, gameSetup, setGameSetup, maxAIPlayers, maxRounds } = useLobby();
  const { sessionMeta, setSessionMeta } = useSession();
  const setStartStep = useUIStore((s) => s.setStartStep);
  // Phase 2: client-side LLM/chat paths removed
  const sessionCreationInFlightRef = useRef(false);

  // no-op: client consequence path removed

  const handleConfirmActions = useCallback(
    (actions: ActionOption[]) => {
      const human = players.find((p) => p.isHuman);
      if (!human) return;
      {
        (async () => {
          setLoading(true, 'Locking in your actions...');
          try {
            const meta = sessionMeta;
            if (!meta) {
              setError('Session not initialized. Please click Start again.');
              return;
            }
            setPlayers((prev) => prev.map((p) => (p.isHuman ? { ...p, actions, hasSubmittedActions: true } : p)));
            const s1 = await SessionService.submitActions(meta!.id, human.id || 'human', actions, meta!.revision);
            setSessionMeta({ id: meta!.id, revision: s1.revision, hostToken: meta!.hostToken } as any);
            SessionService.advance(meta!.id, s1.revision, meta!.hostToken, {
              humanRoleName: human.role.name,
              humanPlayerId: human.id || 'human',
              humanActions: actions,
              humanAvailableOptions: actionOptions,
            }).catch((err) => setError(err?.message || 'Failed to advance round'));
            setActionOptions([]);
          } catch (e: any) {
            setError(e?.message || 'Failed to submit actions to server');
            setPlayers((prev) => prev.map((p) => (p.isHuman ? { ...p, hasSubmittedActions: false } : p)));
          } finally {
            setLoading(false);
          }
        })();
      }
    },
    [players, sessionMeta, gamePath, gameSetup, setSessionMeta, setPlayers, setLoading, setError, actionOptions, gameState]
  );

  const handleStartGame = useCallback(() => {
    if (!selectedRoleName) return;
    const path = (gamePath ?? (gameSetup ? 'custom' : 'classic')) as 'classic' | 'custom' | 'ai_safety';

    // Show loading screen immediately
    setLoading(true, 'Checking backend connection...');

    // CRITICAL FIX: Reset sessionCreationInFlightRef if no session exists
    // This prevents the ref from blocking session creation after the user has cleared the session
    // (e.g., when restarting the game after completion)
    if (!sessionMeta) {
      sessionCreationInFlightRef.current = false;
    }

    if (!sessionMeta && !sessionCreationInFlightRef.current) {
      console.log('[useGameActions] Starting session creation - mode:', path, 'hasSetup:', !!gameSetup);
      sessionCreationInFlightRef.current = true;
      (async () => {
        try {
          // Check backend health before creating session
          console.log('[useGameActions] Running backend health check...');
          const healthResult = await SessionService.healthCheck();
          console.log('[useGameActions] Health check result:', healthResult);

          if (!healthResult.success) {
            const errorMsg = healthResult.error || `Backend unavailable: ${healthResult.store === 'error' ? 'Session store error' : 'API unreachable'}`;
            console.error('[useGameActions] Health check failed:', errorMsg);
            setStartStep('creatingSession', 'error');
            setError(`Backend connection failed: ${errorMsg}. Please refresh and try again.`);
            setLoading(false);
            return;
          }

          console.log('[useGameActions] Health check passed! Store latency:', healthResult.storeLatency, 'ms');

          // Initialize game state and players AFTER health check passes
          setLoading(true, 'Setting up game...');
          try {
            setStartStep('creatingSession', 'running');
            setStartStep('buildingPlayers', 'running');
            setStartStep('generatingScenario', 'idle');
            setStartStep('connectingStream', 'running');
            setStartStep('ready', 'idle');
          } catch {}

          const { players: initialPlayers, coreMetric } = selectInitialPlayers(
            selectedRoleName,
            path,
            gameSetup,
            AI_SAFETY_SCENARIO,
            { name: 'Democratic Legitimacy', description: "Public's trust in the democratic process.", value: 100 },
            { aiCount: typeof maxAIPlayers === 'number' ? maxAIPlayers : undefined }
          );
          setPlayers(initialPlayers);
          setGameState((prev) => ({ ...prev, phase: GamePhase.STARTING, coreMetric, eventLog: prev.phase === GamePhase.LOBBY ? [] : prev.eventLog, round: prev.phase === GamePhase.LOBBY ? 0 : prev.round, currentEvent: null }));
          setLoading(true, 'AI Game Master is generating the initial scenario...');

          // Build canonical setup for ALL modes.
          // If a custom/public setup exists, normalize it to canonical and prune stakeholders to match slider.
          let canonicalSetup: any;
          if (gameSetup) {
            const desiredAI = typeof maxAIPlayers === 'number' ? Math.max(0, Math.min(5, Math.floor(maxAIPlayers))) : 5;
            const cm = gameSetup.coreMetric || (coreMetric as any);
            const cmValue = Number.isFinite((cm as any)?.value) ? Math.max(0, Math.min(100, Math.round((cm as any).value))) : coreMetric.value;
            const normalizedCore = {
              name: (cm as any)?.name || coreMetric.name,
              description: (cm as any)?.description || coreMetric.description,
              value: cmValue,
            };
            const all = Array.isArray((gameSetup as any).stakeholders) ? [...(gameSetup as any).stakeholders] : [];
            const idx = all.findIndex((s: any) => s?.name === selectedRoleName);
            const human = idx >= 0 ? all.splice(idx, 1)[0] : { name: selectedRoleName, icon: '🎯', publicObjective: '', hiddenObjective: '', resources: [], constraints: [] };
            const ai = all.filter((s: any) => s && s.name).slice(0, desiredAI);
            const pruned = [human, ...ai];
            canonicalSetup = {
              ...gameSetup,
              coreMetric: normalizedCore,
              stakeholders: pruned,
              maxRounds: maxRounds ?? null,
              maxAIPlayers: desiredAI,
            } as any;
          } else {
            const fbTitle = path === 'ai_safety'
              ? AI_SAFETY_SCENARIO.scenarioTitle
              : ELECTION_PRESET_ABOUT.scenarioTitle;
            const fbDesc = path === 'ai_safety'
              ? AI_SAFETY_SCENARIO.scenarioDescription
              : ELECTION_PRESET_ABOUT.scenarioDescription;
            canonicalSetup = createCanonicalSetup(
              { ...gameState, coreMetric },
              initialPlayers,
              fbTitle,
              fbDesc,
              { maxRounds: maxRounds ?? null, maxAIPlayers: maxAIPlayers ?? null }
            );
          }
          // Ensure required+nullable fields exist per canonical schema
          canonicalSetup = {
            ...canonicalSetup,
            maxRounds: (canonicalSetup as any).maxRounds ?? null,
            maxAIPlayers: (canonicalSetup as any).maxAIPlayers ?? null,
          } as any;

          console.log('[useGameActions] Calling SessionService.create with setup:', {
            mode: path,
            stakeholders: (canonicalSetup.stakeholders as any[]).length,
            roles: (canonicalSetup.stakeholders as any[]).map((s: any) => s.name)
          });
          const created = await SessionService.create({ mode: path, setup: canonicalSetup });
          console.log('[useGameActions] Session created successfully! ID:', created.id, 'revision:', created.revision);
          setSessionMeta({ id: created.id, revision: created.revision, hostToken: created.hostToken } as any);
          setStartStep('creatingSession', 'done');

          // Finalize setup before initialize
          const setup = gameSetup || createCanonicalSetup(gameState, initialPlayers, undefined, undefined, { maxRounds: maxRounds ?? null, maxAIPlayers: maxAIPlayers ?? null });
          setGameSetup(setup);

          // CRITICAL: Wait for SSE connection to be ACTUALLY established before initializing
          // Production environments have higher latency than localhost, so a fixed delay doesn't work
          // Instead, we poll for sseStatus.state === 'connected' which is set when first SSE event arrives
          console.log('[useGameActions] 🔍 Waiting for SSE connection to establish...');
          console.log('[useGameActions] Session ID:', created.id);
          console.log('[useGameActions] Scenario:', (canonicalSetup.scenarioTitle as string)?.substring(0, 50));
          const pollStartTime = Date.now();
          const maxWaitTime = 15000; // 15 seconds max wait (allow for Redis latency in dev)
          const pollInterval = 100; // Check every 100ms
          let waited = 0;

          while (waited < maxWaitTime) {
            // Import sseStatus from sessionStore
            const { sseStatus } = await import('@/stores/sessionStore').then(m => m.useSessionStore.getState());

            if (waited % 500 === 0 || sseStatus.state !== 'connecting') {
              // Log every 500ms or on state change
              console.log('[useGameActions] SSE poll check:', {
                waited,
                state: sseStatus.state,
                lastEventType: sseStatus.lastEventType,
                lastEventTime: sseStatus.lastEventTime,
                error: sseStatus.error
              });
            }

            if (sseStatus.state === 'connected') {
              console.log('[useGameActions] ✅ SSE connected after', waited, 'ms');
              console.log('[useGameActions] Last event:', sseStatus.lastEventType, 'at', sseStatus.lastEventTime);
              break;
            }
            if (sseStatus.state === 'error') {
              console.error('[useGameActions] ❌ SSE connection failed:', sseStatus.error);
              setError('Failed to establish connection to game server. Please try again.');
              setLoading(false);
              return;
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            waited += pollInterval;
          }

          if (waited >= maxWaitTime) {
            const { sseStatus: finalStatus } = await import('@/stores/sessionStore').then(m => m.useSessionStore.getState());
            console.warn('[useGameActions] ⚠️ SSE connection timeout after', waited, 'ms');
            console.warn('[useGameActions] Final SSE state:', finalStatus.state);
            console.warn('[useGameActions] Proceeding anyway - scenario:', (canonicalSetup.scenarioTitle as string)?.substring(0, 50));
          }

          // CRITICAL: Clear loading BEFORE initializing to avoid race condition
          // When initialize() triggers SSE update with ACTION phase, isLoading must already be false
          // so that the action options useEffect can trigger
          setLoading(false);
          setStartStep('generatingScenario', 'done');
          setStartStep('ready', 'done');

          // Initialize session with scenario so backend has game state for action-options
          console.log('[useGameActions] Initializing session scenario...');
          const initSnap = await SessionService.initialize(created.id);
          // Update sessionMeta with latest revision from initialize
          setSessionMeta({ id: created.id, revision: initSnap.revision, hostToken: created.hostToken } as any);
          console.log('[useGameActions] Session initialized successfully at rev', initSnap.revision);
          console.log('[useGameActions] Game start complete - ready for action phase');
        } catch (e) {
          console.error('[useGameActions] Session creation/initialization failed:', e);
          setStartStep('creatingSession', 'error');
          setLoading(false);
        } finally {
          sessionCreationInFlightRef.current = false;
        }
      })();
    } else {
      console.log('[useGameActions] Skipping session creation - hasSessionMeta:', !!sessionMeta, 'inFlight:', sessionCreationInFlightRef.current);
      setLoading(false);
    }
  }, [selectedRoleName, gamePath, gameSetup, sessionMeta, setSessionMeta, setPlayers, setGameState, setLoading, setError]);

  return { handleStartGame, handleConfirmActions } as const;
}
