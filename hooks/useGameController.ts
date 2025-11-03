import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  GameState,
  Player,
  RoleData,
  ActionOption,
  GameLogEntry,
  GameSetup,
  CoreMetric,
  PlayerRoundActions,
} from '../types';
import { GamePhase } from '../types';
import { ROLES, GAME_CONFIG } from '../constants';
import { clampScore, createInitialGameStateFromScenario, applyConsequences } from '../lib/gameLogic';
import { buildRolesFromSetup as buildRolesFromSetupHelper, selectInitialPlayers, createCanonicalSetup } from '../lib/gameSetup';
import { AI_SAFETY_SCENARIO } from '../presets';
import {
  generateActionOptions,
  generateCounterfactualConsequences,
  generateCustomScenario,
  generateAITurn,
  generateInitialScenarioChat,
  generateConsequencesChat,
} from '../services/llmApiClient';
import { SessionService } from '@/services/SessionService';
import { useGameActions as useModularGameActions } from '@/hooks/useGameActions';
import { useSessionStore } from '@/stores/sessionStore';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';

const DEFAULT_CORE_METRIC: CoreMetric = {
  name: 'Democratic Legitimacy',
  description: "The public's trust in the democratic process.",
  value: 100,
};

// clampScore imported from lib/gameLogic

export const useGameController = () => {
  const gameState = useGameStore((s) => s.gameState);
  const players = useGameStore((s) => s.players);
  const setGameStateStore = useGameStore((s) => s.setGameState);
  const setPlayersStore = useGameStore((s) => s.setPlayers);
  const resetGameStore = useGameStore((s) => s.reset);
  const [selectedRoleName, setSelectedRoleName] = useState<string | null>(null);
  const [gamePath, setGamePath] = useState<'classic' | 'custom' | 'ai_safety' | null>(null);
  const gameSetup = useGameStore((s) => s.gameSetup);
  const setGameSetupStore = useGameStore((s) => s.setGameSetup);
  const setGameSetup = setGameSetupStore;
  const [customScenario, setCustomScenario] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(GAME_CONFIG.ACTION_PHASE_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  // Tracks number of AI (LLM) API calls in the current round
  const llmCallsThisRoundRef = useRef(0);
  const [actionOptions, setActionOptions] = useState<ActionOption[]>([]);
  const actionReqInFlightRef = useRef(false);
  const [aiCompletionStatus, setAiCompletionStatus] = useState<Record<string, boolean>>({});
  const [isActionTreeOpen, setIsActionTreeOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [sessionMeta, setSessionMeta] = useState<{ id: string; revision: number; hostToken: string } | null>(null);
  const sessionStreamRef = useRef<EventSource | null>(null);
  const USE_BACKEND_STATE = useMemo(() => {
    try { return (process as any)?.env?.NEXT_PUBLIC_BACKEND_STATE === '1'; } catch { return false; }
  }, []);
  const { setStartIntent, clear: clearSessionStore } = useSessionStore();
  const BACKEND_MODE = useMemo(() => USE_BACKEND_STATE || sessionMeta !== null, [USE_BACKEND_STATE, sessionMeta]);
  const setStartStep = useUIStore((s) => s.setStartStep);
  const resetUI = useUIStore((s) => s.reset);

  // wrappers so existing code continues to work
  const setGameState = useCallback(
    (next: GameState | ((prev: GameState) => GameState)) => setGameStateStore(next as any),
    [setGameStateStore]
  );
  const setPlayers = useCallback(
    (next: Player[] | ((prev: Player[]) => Player[])) => setPlayersStore(next as any),
    [setPlayersStore]
  );

  // Chat history for maintaining conversation context (managed client-side, sent to backend)
  const chatHistoryRef = useRef<any[] | null>(null);

  const humanPlayer = useMemo(() => players.find((p) => p.isHuman), [players]);
  const latestLogEntry = useMemo(
    () => (gameState.eventLog.length > 0 ? gameState.eventLog[gameState.eventLog.length - 1] : null),
    [gameState.eventLog]
  );
  const lastCompletedLogEntry = useMemo(
    () => gameState.eventLog.find((entry) => entry.round === gameState.round - 1) || null,
    [gameState.eventLog, gameState.round]
  );

  // Get the log entry for the expanded round (for action tree), or latest if none selected
  const selectedLogEntry = useMemo(
    () => {
      if (expandedRound !== null) {
        return gameState.eventLog.find(log => log.round === expandedRound) ?? latestLogEntry;
      }
      return latestLogEntry;
    },
    [expandedRound, gameState.eventLog, latestLogEntry]
  );

  // No local converters; use helpers in lib/gameLogic where needed

  const callLLMAndCount = useCallback(
    async <T extends (...args: any[]) => Promise<any>>(apiFunc: T, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | null> => {
      llmCallsThisRoundRef.current += 1;
      const result = await apiFunc(...args);
      if (result === null) {
        setError('An API call to the AI model failed. Check the console for details.');
        return null;
      }
      return result;
    },
    []
  );

  const resetState = useCallback(() => {
    resetGameStore();
    setSelectedRoleName(null);
    setGamePath(null);
    setGameSetup(null);
    setCustomScenario('');
    setIsLoading(false);
    setError(null);
    setActionOptions([]);
    setIsPaused(false);
    setAiCompletionStatus({});
    llmCallsThisRoundRef.current = 0;
    setIsActionTreeOpen(false);
    setIsHistoryOpen(false);
    setExpandedRound(null);
    // Clean up chat history
    chatHistoryRef.current = null;
    try { setStartIntent(false); } catch {}
    try { clearSessionStore(); } catch {}
    try { resetUI(); } catch {}
  }, [resetGameStore, clearSessionStore, setStartIntent]);

  const handleCustomGameStart = useCallback(async () => {
    if (!customScenario.trim()) return;
    setIsLoading(true);
    setLoadingMessage('Generating your custom scenario... This can take a moment.');
    setError(null);

    const setup = await generateCustomScenario(customScenario);

    if (setup) {
      setGameSetup(setup);
    } else {
      setError('The AI failed to generate a valid game setup. Please try a different scenario description or try again later.');
    }
    setIsLoading(false);
    setLoadingMessage('');
  }, [customScenario]);

  const runConsequencePhase = useCallback(
    async (currentPlayers: Player[], currentGameState: GameState) => {
      if (BACKEND_MODE) {
        // Server-authoritative mode handles consequences via /advance + SSE.
        return;
      }
      setIsLoading(true);

      let playersWithActions = [...currentPlayers];
      const aiPlayers = currentPlayers.filter((p) => !p.isHuman);

      const initialStatus = Object.fromEntries(aiPlayers.map((p) => [p.role.name, false]));
      setAiCompletionStatus(initialStatus);

      setLoadingMessage('AI Game Master is assessing the situation...');
      const counterfactualPromise = callLLMAndCount(generateCounterfactualConsequences, currentGameState);

      const previousRoundLog = currentGameState.eventLog.find((entry) => entry.round === currentGameState.round - 1);
      const previousRoundActions = previousRoundLog ? previousRoundLog.playerActions : null;

      // OPTIMIZED: Use single generateAITurn call instead of separate options + actions
      let aiTurnResults: (Awaited<ReturnType<typeof generateAITurn>> | null)[] = [];

      if (aiPlayers.length > 0) {
        setLoadingMessage('AI players are analyzing and choosing their actions...');
        const aiTurnPromises = aiPlayers.map((player) =>
          callLLMAndCount(generateAITurn, player, currentGameState, previousRoundActions).then((result) => {
            setAiCompletionStatus((prev) => ({ ...prev, [player.role.name]: true }));
            return result;
          })
        );
        aiTurnResults = await Promise.all(aiTurnPromises);

        if (aiTurnResults.some((r) => r === null)) {
          setError('Failed to generate AI player turns. The simulation cannot continue.');
          setIsLoading(false);
          setLoadingMessage('');
          return;
        }

        const aiActionsByRole: Record<string, ActionOption[]> = {};
        aiPlayers.forEach((player, index) => {
          aiActionsByRole[player.role.name] = aiTurnResults[index]?.chosenActions || [];
        });

        playersWithActions = currentPlayers.map((p) => {
          if (!p.isHuman && aiActionsByRole[p.role.name]) {
            return { ...p, actions: aiActionsByRole[p.role.name], hasSubmittedActions: true };
          }
          return p;
        });
      }

      setPlayers(playersWithActions);

      setLoadingMessage('AI Game Master is processing the consequences...');
      const counterfactualResult = await counterfactualPromise;
      if (!counterfactualResult) {
        setError('The AI Game Master failed to calculate the counterfactual. The simulation cannot continue.');
        setIsLoading(false);
        setLoadingMessage('');
        return;
      }

      // Chat mode only: always call chat consequences endpoint
      // Ensure we always send a valid setup to the chat endpoint.
      const setupForChat: GameSetup = (gameSetup ?? createCanonicalSetup(currentGameState, currentPlayers));
      let result;
      const cons = await callLLMAndCount(
        () => generateConsequencesChat(
          currentGameState,
          playersWithActions,
          counterfactualResult.publicScoreUpdate,
          chatHistoryRef.current || [],
          setupForChat
        )
      );
      if (cons) {
        result = cons.consequences;
        chatHistoryRef.current = cons.chatHistory;
      } else {
        setError('The AI Game Master failed to process consequences (chat mode). Please retry.');
        setIsLoading(false);
        setLoadingMessage('');
        return;
      }

      if (result) {
        const { gameState: nextState, players: nextPlayers } = applyConsequences(
          currentGameState,
          result,
          playersWithActions,
          aiPlayers,
          aiTurnResults as any,
          actionOptions,
          llmCallsThisRoundRef.current,
        );
        setTimer(GAME_CONFIG.ACTION_PHASE_SECONDS);
        setGameState(nextState);
        setPlayers(nextPlayers);
        setActionOptions([]);
        setIsLoading(false);
        setLoadingMessage('');
        setAiCompletionStatus({});
        llmCallsThisRoundRef.current = 0;
      } else {
        setError('The AI Game Master failed to provide a consequence. The simulation cannot continue.');
        setIsLoading(false);
        setLoadingMessage('');
      }
    },
    [actionOptions, callLLMAndCount]
  );

  const handleConfirmActions = useCallback(
    (actions: ActionOption[]) => {
      if (!humanPlayer) return;
      // Server-authoritative path: submit and advance via /api/session
      if (BACKEND_MODE) {
        (async () => {
          setIsLoading(true);
          setLoadingMessage('Locking in your actions...');
          try {
            // Ensure a session exists
            let meta = sessionMeta;
            if (!meta) {
              const created = await SessionService.create({ mode: (gamePath || 'classic') as any, setup: gameSetup || undefined });
              meta = { id: created.id, revision: created.revision, hostToken: created.hostToken };
              setSessionMeta(meta);
            }
            // Optimistically show user's submitted actions and switch to waiting UI
            setPlayers((prev) =>
              prev.map((p) => (p.isHuman ? { ...p, actions, hasSubmittedActions: true } : p))
            );
            const aiRoles = players.filter((p) => !p.isHuman).map((p) => p.role.name);
            if (aiRoles.length > 0) {
              setAiCompletionStatus(Object.fromEntries(aiRoles.map((name) => [name, false])));
            }
            // Submit actions with optimistic concurrency
            const s1 = await SessionService.submitActions(meta!.id, humanPlayer.id || 'human', actions, meta!.revision);
            setSessionMeta((prev) => (prev ? { ...prev, revision: s1.revision } : { id: meta!.id, revision: s1.revision, hostToken: meta!.hostToken }));

            // Fire-and-forget advance; rely on SSE to update state/progress
            SessionService
              .advance(
                meta!.id,
                s1.revision,
                meta!.hostToken,
                {
                  humanRoleName: humanPlayer.role.name,
                  humanPlayerId: humanPlayer.id || 'human',
                  humanActions: actions,
                  humanAvailableOptions: actionOptions,
                }
              )
              .then((adv: any) => {
                setSessionMeta({ id: meta!.id, revision: adv.revision, hostToken: meta!.hostToken });
                if (adv.state) {
                  setGameState(adv.state as GameState);
                }
                // Do not clear human actions here; let the SSE/next-round snapshot drive UI reset
                // Keep AI progress until server signals advance via SSE
              })
              .catch((err: any) => {
                setError(err?.message || 'Failed to advance round');
                setIsLoading(false);
                setLoadingMessage('');
              });

            setIsLoading(false);
            setLoadingMessage('');
            setActionOptions([]);
          } catch (e: any) {
            setError(e?.message || 'Failed to submit actions to server');
            setIsLoading(false);
            setLoadingMessage('');
            // Roll back optimistic submitted flag on failure
            setPlayers((prev) => prev.map((p) => (p.isHuman ? { ...p, hasSubmittedActions: false } : p)));
          }
        })();
        return;
      }
      const updatedPlayer = { ...humanPlayer, actions, hasSubmittedActions: true };
      const updatedPlayers = players.map((p) => (p.isHuman ? updatedPlayer : p));
      setPlayers(updatedPlayers);
      runConsequencePhase(updatedPlayers, gameState);
    },
    [USE_BACKEND_STATE, gamePath, gameSetup, gameState, humanPlayer, players, runConsequencePhase, sessionMeta]
  );

  const buildRolesFromSetup = useCallback((setup: GameSetup): RoleData[] => buildRolesFromSetupHelper(setup), []);

  const handleStartGame = useCallback(() => {
    if (!selectedRoleName) return;
    const path = gamePath ?? 'classic';
    try { setStartIntent(true); } catch {}
    // Reset and start progress indicator
    try {
      setStartStep('creatingSession', USE_BACKEND_STATE ? 'running' : 'done');
      setStartStep('buildingPlayers', 'running');
      setStartStep('generatingScenario', 'idle');
      setStartStep('connectingStream', USE_BACKEND_STATE ? 'running' : 'idle');
      setStartStep('ready', 'idle');
    } catch {}

    // Initialize a server session in the background when feature flag is on
    if (USE_BACKEND_STATE && !sessionMeta) {
      (async () => {
        try {
          const created = await SessionService.create({ mode: path as any, setup: path === 'custom' ? gameSetup || undefined : undefined });
          setSessionMeta({ id: created.id, revision: created.revision, hostToken: created.hostToken });
          try { setStartStep('creatingSession', 'done'); } catch {}
        } catch (e) {
          // non-fatal for client path; we still start game locally
          try { console.warn('[useGameController] createSession failed (non-fatal):', e); } catch {}
          try { setStartStep('creatingSession', 'error'); } catch {}
        }
      })();
    }

    const { players: initialPlayers, coreMetric } = selectInitialPlayers(
      selectedRoleName,
      path,
      gameSetup,
      AI_SAFETY_SCENARIO,
      DEFAULT_CORE_METRIC,
    );

    setPlayers(initialPlayers);
    try { setStartStep('buildingPlayers', 'done'); } catch {}
    setGameState((prev) => ({
      ...prev,
      phase: GamePhase.STARTING,
      coreMetric,
      eventLog: prev.phase === GamePhase.LOBBY ? [] : prev.eventLog,
      round: prev.phase === GamePhase.LOBBY ? 0 : prev.round,
      currentEvent: null,
    }));
    setIsLoading(true);
    setLoadingMessage('AI Game Master is generating the initial scenario...');
    try { setStartStep('generatingScenario', 'running'); } catch {}
  }, [selectedRoleName, gamePath, gameSetup, buildRolesFromSetup]);

  useEffect(() => {
    if (gameState.phase !== GamePhase.STARTING) return;

    const initializeClassicScenario = async () => {
      llmCallsThisRoundRef.current = 0;

      // Chat mode only: Create and persist canonical setup, then call chat endpoint
      const setup = gameSetup || createCanonicalSetup(gameState, players);
      setGameSetupStore(setup);

      const initChat = await callLLMAndCount(() => generateInitialScenarioChat(setup, players));
      const result = initChat ? initChat.scenario : null;
      if (initChat) chatHistoryRef.current = initChat.chatHistory;

      if (result) {
        const initialGameState = createInitialGameStateFromScenario(gameState, result, llmCallsThisRoundRef.current);
        setTimer(GAME_CONFIG.ACTION_PHASE_SECONDS);
        setGameState(initialGameState);
        setIsLoading(false);
        setLoadingMessage('');
        try {
          setStartStep('generatingScenario', 'done');
          setStartStep('ready', 'done');
        } catch {}
      } else {
        setError('The AI Game Master failed to initialize the game. Please refresh and try again.');
        setGameState((prev) => ({ ...prev, phase: GamePhase.LOBBY }));
        setIsLoading(false);
        setLoadingMessage('');
        try { setStartStep('generatingScenario', 'error'); } catch {}
      }
    };

    const initializePresetScenario = (setup: GameSetup) => {
      llmCallsThisRoundRef.current = 0;

      // Persist canonical setup for AI Safety / predefined scenarios
      setGameSetupStore(setup);

      // Initialize chat history for preset scenarios (chat mode only)
      chatHistoryRef.current = [];

      const initialGameState: GameState = {
        ...gameState,
        phase: GamePhase.ACTION,
        round: 1,
        currentEvent: {
          headline: setup.scenarioTitle,
          detail: setup.scenarioDescription,
        },
        eventLog: [
          {
            round: 0,
            roundSummary: setup.scenarioDescription,
            outcomeTimeline: [],
            counterfactualNote:
              'If no one had acted, the crisis would remain poised to escalate immediately once the simulation begins.',
            event: null,
            playerActions: [],
            publicScoreChange: 0,
            publicScoreAfter: gameState.coreMetric.value,
            hiddenScoreChanges: {},
            geminiCalls: 0,
          },
        ],
      };
      setTimer(GAME_CONFIG.ACTION_PHASE_SECONDS);
      setGameState(initialGameState);
      setIsLoading(false);
      setLoadingMessage('');
      try {
        setStartStep('generatingScenario', 'done');
        setStartStep('ready', 'done');
      } catch {}
    };

    if (gamePath === 'classic' || !gamePath) {
      initializeClassicScenario();
    } else {
      const setup = gamePath === 'ai_safety' ? AI_SAFETY_SCENARIO : gameSetup;
      if (!setup) {
        setError('Cannot start game without a valid game setup.');
        setGameState((prev) => ({ ...prev, phase: GamePhase.LOBBY }));
        setIsLoading(false);
        setLoadingMessage('');
        return;
      }
      initializePresetScenario(setup);
    }
  }, [callLLMAndCount, gamePath, gameSetup, gameState, runConsequencePhase]);

  useEffect(() => {
    if (
      gameState.phase === GamePhase.ACTION &&
      humanPlayer &&
      !humanPlayer.hasSubmittedActions &&
      actionOptions.length === 0 &&
      !isLoading &&
      !actionReqInFlightRef.current
    ) {
      (async () => {
        actionReqInFlightRef.current = true;
        setIsLoading(true);
        setLoadingMessage('Generating action options...');
        llmCallsThisRoundRef.current = 0;
        try {
          let res: { options: ActionOption[] } | null = null;
          if (BACKEND_MODE) {
            // Ensure a session exists before fetching options
            let meta = sessionMeta;
            if (!meta) {
              try {
                const created = await SessionService.create({ mode: (gamePath || 'classic') as any, setup: gameSetup || undefined });
                meta = { id: created.id, revision: created.revision, hostToken: created.hostToken };
                setSessionMeta(meta);
              } catch (e) {
                console.warn('[UI] createSession failed in backend mode:', e);
              }
            }
            if (meta) {
              console.log(`[UI] fetching server action-options for player=${humanPlayer.role.name} session=${meta.id}`);
              const data = await SessionService.getActionOptions(meta.id, humanPlayer.id || 'human', humanPlayer.role.name);
              res = { options: data.options };
            }
          }
          if (!res) {
            res = await callLLMAndCount(
              generateActionOptions,
              humanPlayer,
              gameState,
              lastCompletedLogEntry?.playerActions || null
            );
          }
          if (res) {
            // Helpful debug breadcrumb in dev
            try { console.log('[UI] action-options loaded:', res.options?.length ?? 0); } catch {}
            setActionOptions(res.options);
          } else {
            setError('Failed to generate action options. You may not be able to proceed.');
          }
        } catch (e) {
          setError('Action options request failed. Check console for details.');
          try { console.error('[UI] action-options error:', e); } catch {}
        } finally {
          actionReqInFlightRef.current = false;
          setIsLoading(false);
          setLoadingMessage('');
        }
      })();
    }
  }, [BACKEND_MODE, sessionMeta, gameSetup, gamePath, actionOptions.length, callLLMAndCount, gameState, humanPlayer, isLoading, lastCompletedLogEntry]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (timer > 0 && gameState.phase === GamePhase.ACTION && !isPaused && !humanPlayer?.hasSubmittedActions) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer <= 0 && gameState.phase === GamePhase.ACTION && humanPlayer && !humanPlayer.hasSubmittedActions) {
      handleConfirmActions([]);
    }
    return () => clearInterval(interval);
  }, [gameState.phase, handleConfirmActions, humanPlayer, isPaused, timer]);

  useEffect(() => {
    if (
      (gameState.round > GAME_CONFIG.MAX_ROUNDS || (gameState.coreMetric.value <= 0 && gameState.round > 0)) &&
      gameState.phase !== GamePhase.END
    ) {
      setGameState((prev) => ({ ...prev, phase: GamePhase.END }));
    }
  }, [gameState.coreMetric.value, gameState.phase, gameState.round]);

  // When the game ends, clear the start intent so the router doesn't bounce back to /game.
  useEffect(() => {
    if (gameState.phase === GamePhase.END) {
      try { setStartIntent(false); } catch {}
    }
  }, [gameState.phase]);

  useEffect(() => {
    if (!isHistoryOpen) {
      setExpandedRound(null);
    }
  }, [isHistoryOpen]);

  useEffect(() => {
    if (!USE_BACKEND_STATE) return;
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (!sessionMeta?.id) {
      if (sessionStreamRef.current) {
        sessionStreamRef.current.close();
        sessionStreamRef.current = null;
      }
      return;
    }

    if (sessionStreamRef.current) {
      sessionStreamRef.current.close();
      sessionStreamRef.current = null;
    }

    const source = new EventSource(`/api/session/${sessionMeta.id}/stream`);
    sessionStreamRef.current = source;

    const handleSessionEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        const snapshot = payload?.snapshot;
        if (!snapshot) return;
        try {
          console.log('[SSE] event', payload?.type || 'snapshot', 'rev=', snapshot.revision, 'round=', snapshot.state?.round);
        } catch {}

        setSessionMeta((prev) => (prev ? { ...prev, revision: snapshot.revision } : prev));
        try { setStartStep('connectingStream', 'done'); } catch {}
        if (snapshot.state) {
          setGameState(snapshot.state as GameState);
        }
        if (snapshot.setup) {
          setGameSetupStore((prev) => prev ?? (snapshot.setup as GameSetup));
        }
        const submitted = snapshot.submitted ?? {};
        const serverPlayers: Array<{ id?: string; role?: { name: string }; actions?: ActionOption[]; hasSubmittedActions?: boolean }> =
          (snapshot.players as any) ?? [];
        setPlayers((prev) => {
          if (prev.length === 0) return prev;
          return prev.map((p) => {
            const match = serverPlayers.find((sp) => sp.id === p.id || sp.role?.name === p.role.name);
            const serverId = match?.id ?? p.id;
            const mergedActions = Array.isArray(match?.actions) ? (match!.actions as ActionOption[]) : p.actions;
            const submittedFlag =
              typeof submitted[serverId] === 'boolean'
                ? submitted[serverId]
                : match?.hasSubmittedActions ?? p.hasSubmittedActions;
            return {
              ...p,
              actions: mergedActions,
              hasSubmittedActions: submittedFlag,
            };
          });
        });
        const progressMeta = payload?.payload;
        if (progressMeta?.role) {
          setAiCompletionStatus((prev) => ({ ...prev, [progressMeta.role as string]: true }));
        }
        if (payload?.type === 'advance') {
          setAiCompletionStatus({});
        }
        if (payload?.type === 'advance') {
          setIsLoading(false);
          setLoadingMessage('');
          setError(null);
          setActionOptions([]);
          try { setStartStep('ready', 'done'); } catch {}
        }
      } catch (err) {
        try { console.warn('[useGameController] SSE parse error:', err); } catch {}
      }
    };

    const handleError = () => {
      try { console.warn('[useGameController] SSE stream error, closing'); } catch {}
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
  }, [USE_BACKEND_STATE, sessionMeta?.id]);

  const handleOpenActionTree = useCallback(() => {
    setIsActionTreeOpen(true);
  }, []);

  const handleToggleHistory = useCallback(() => {
    setIsHistoryOpen((prev) => !prev);
  }, []);

  const canViewActionTree = useMemo(() => gameState.eventLog.some((entry) => entry.playerActions.length > 0), [gameState.eventLog]);

  return {
    state: {
      gameState,
      players,
      selectedRoleName,
      gamePath,
      gameSetup,
      customScenario,
      isLoading,
      loadingMessage,
      error,
      timer,
      isPaused,
      actionOptions,
      aiCompletionStatus,
      isActionTreeOpen,
      isHistoryOpen,
      expandedRound,
      latestLogEntry,
      selectedLogEntry,
      canViewActionTree,
    },
    actions: {
      setSelectedRoleName,
      setGamePath,
      setGameSetup: setGameSetupStore,
      setCustomScenario,
      setExpandedRound,
      setIsActionTreeOpen,
      setIsPaused,
      handleCustomGameStart,
      handleStartGame: modularStart,
      handleConfirmActions: modularConfirm,
      resetState,
      handleOpenActionTree,
      handleToggleHistory,
    },
    derived: {
      humanPlayer,
      handlePauseToggle: () => setIsPaused((prev) => !prev),
    },
  } as const;
};
  // Modular actions (compat shim): allow pages to keep using useGameController while we migrate
  const { handleStartGame: modularStart, handleConfirmActions: modularConfirm, runConsequencePhase: modularConsequence } = useModularGameActions();
