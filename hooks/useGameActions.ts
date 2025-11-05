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
import { AI_SAFETY_SCENARIO } from '@/presets';

export function useGameActions() {
  const { gameState, players, setGameState, setPlayers } = useGame();
  const { setLoading, setError } = useUI();
  const { actionOptions, setActionOptions } = useActions();
  const { selectedRoleName, gamePath, gameSetup, setGameSetup, maxAIPlayers, maxRounds } = useLobby();
  const { sessionMeta, isBackendMode, setSessionMeta } = useSession();
  const setStartStep = useUIStore((s) => s.setStartStep);
  // Phase 2: client-side LLM/chat paths removed
  const sessionCreationInFlightRef = useRef(false);

  // no-op: client consequence path removed

  const handleConfirmActions = useCallback(
    (actions: ActionOption[]) => {
      const human = players.find((p) => p.isHuman);
      if (!human) return;
      if (isBackendMode) {
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
        return;
      }
      const updatedPlayers = players.map((p) => (p.isHuman ? { ...p, actions, hasSubmittedActions: true } : p));
      setPlayers(updatedPlayers);
      setError('Backend session mode is required.');
    },
    [players, isBackendMode, sessionMeta, gamePath, gameSetup, setSessionMeta, setPlayers, setLoading, setError, actionOptions, gameState]
  );

  const handleStartGame = useCallback(() => {
    if (!selectedRoleName) return;
    const path = (gamePath ?? 'classic') as 'classic' | 'custom' | 'ai_safety';
    try {
      setStartStep('creatingSession', isBackendMode ? 'running' : 'done');
      setStartStep('buildingPlayers', 'running');
      setStartStep('generatingScenario', 'idle');
      setStartStep('connectingStream', isBackendMode ? 'running' : 'idle');
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

    if (isBackendMode && !sessionMeta && !sessionCreationInFlightRef.current) {
      console.log('[useGameActions] Starting session creation - mode:', path, 'hasSetup:', !!gameSetup);
      sessionCreationInFlightRef.current = true;
      (async () => {
        try {
          // Build canonical setup for ALL modes (not just custom)
          // This ensures server gets full roster and can create all AI players
          const baseSetup = gameSetup || createCanonicalSetup(
            { ...gameState, coreMetric },
            initialPlayers,
            'Election Crisis 2024',
            'A rapidly escalating crisis threatens democratic legitimacy.',
            { maxRounds: maxRounds ?? null, maxAIPlayers: maxAIPlayers ?? null }
          );
          // Ensure required+nullable fields exist per canonical schema
          const canonicalSetup = {
            ...baseSetup,
            maxRounds: (baseSetup as any).maxRounds ?? null,
            maxAIPlayers: (baseSetup as any).maxAIPlayers ?? null,
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

          // Initialize session with scenario so backend has game state for action-options
          console.log('[useGameActions] Initializing session scenario...');
          const initSnap = await SessionService.initialize(created.id);
          // Update sessionMeta with latest revision from initialize
          setSessionMeta({ id: created.id, revision: initSnap.revision, hostToken: created.hostToken } as any);
          console.log('[useGameActions] Session initialized successfully at rev', initSnap.revision);
        } catch (e) {
          console.error('[useGameActions] Session creation/initialization failed:', e);
          setStartStep('creatingSession', 'error');
        } finally {
          sessionCreationInFlightRef.current = false;
        }
      })();
    } else {
      console.log('[useGameActions] Skipping session creation - isBackendMode:', isBackendMode, 'hasSessionMeta:', !!sessionMeta, 'inFlight:', sessionCreationInFlightRef.current);
    }

    (async () => {
      const setup = gameSetup || createCanonicalSetup(gameState, initialPlayers, undefined, undefined, { maxRounds: maxRounds ?? null, maxAIPlayers: maxAIPlayers ?? null });
      setGameSetup(setup);
      // Phase 2: The server initializes; SSE will update the stores. No client LLM initialization.
      setLoading(false);
      setStartStep('generatingScenario', 'done');
      setStartStep('ready', 'done');
    })();
  }, [selectedRoleName, gamePath, gameSetup, isBackendMode, sessionMeta, setSessionMeta, setPlayers, setGameState, setLoading, setError]);

  return { handleStartGame, handleConfirmActions } as const;
}
