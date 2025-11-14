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
import { useRoundOptions } from '@/hooks/useRoundOptions';

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
  // sessionStreamRef removed - SSE now managed by SessionMonitor component
  // Backend mode always on
  const { sessionMeta, setSessionMeta, setStartIntent, clear: clearSessionStore } = useSessionStore();
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

  // Modular actions (compat shim): allow pages to keep using useGameController while we migrate
  const { handleStartGame: modularStart, handleConfirmActions: modularConfirm } = useModularGameActions();

  // Round options hook (must be called at top level, not in useEffect)
  const { loadHumanOptions } = useRoundOptions();

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

  // Pruned: consequence logic handled by modular useGameActions
  const runConsequencePhase = useCallback((currentPlayers: Player[], currentGameState: GameState) => {
    console.warn('[useGameController] runConsequencePhase is deprecated; use useGameActions instead.');
  }, []);

  // Pruned: confirm logic handled by modular useGameActions
  const handleConfirmActions = useCallback((actions: ActionOption[]) => {
    console.warn('[useGameController] handleConfirmActions is deprecated; use useGameActions instead.');
  }, []);

  const buildRolesFromSetup = useCallback((setup: GameSetup): RoleData[] => buildRolesFromSetupHelper(setup), []);

  const handleStartGame = useCallback(() => {
    if (!selectedRoleName) return;
    const path = gamePath ?? 'classic';
    try { setStartIntent(true); } catch {}
    // Reset and start progress indicator
    try {
      setStartStep('creatingSession', 'running');
      setStartStep('buildingPlayers', 'running');
      setStartStep('generatingScenario', 'idle');
      setStartStep('connectingStream', 'running');
      setStartStep('ready', 'idle');
    } catch {}

    // Build players FIRST so we can create proper setup for session
    const { players: initialPlayers, coreMetric } = selectInitialPlayers(
      selectedRoleName,
      path,
      gameSetup,
      AI_SAFETY_SCENARIO,
      DEFAULT_CORE_METRIC,
    );

    setPlayers(initialPlayers);

    // Initialize a server session in the background when feature flag is on
    // Must happen AFTER players are built so we can create canonical setup
    if (!sessionMeta) {
      (async () => {
        try {
          // Build canonical setup from players (all modes need full roster)
          const tempState = { phase: GamePhase.LOBBY, round: 0, coreMetric, eventLog: [], currentEvent: null } as GameState;
          const canonicalSetup = gameSetup || createCanonicalSetup(tempState, initialPlayers);
          const created = await SessionService.create({ mode: path as any, setup: canonicalSetup });
          setSessionMeta({ id: created.id, revision: created.revision, hostToken: created.hostToken });
          try { setStartStep('creatingSession', 'done'); } catch {}
        } catch (e) {
          // non-fatal for client path; we still start game locally
          try { console.warn('[useGameController] createSession failed (non-fatal):', e); } catch {}
          try { setStartStep('creatingSession', 'error'); } catch {}
        }
      })();
    }
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
  }, [callLLMAndCount, gamePath, gameSetup, gameState]);

  useEffect(() => {
    if (
      gameState.phase === GamePhase.ACTION &&
      humanPlayer &&
      !humanPlayer.hasSubmittedActions &&
      actionOptions.length === 0 &&
      !isLoading &&
      !actionReqInFlightRef.current
    ) {
      actionReqInFlightRef.current = true;
      setIsLoading(true);
      setLoadingMessage('Generating action options...');
      llmCallsThisRoundRef.current = 0;
      loadHumanOptions()
        .catch(() => {})
        .finally(() => {
          actionReqInFlightRef.current = false;
          setIsLoading(false);
          setLoadingMessage('');
        });
    }
  }, [gameState.phase, humanPlayer?.hasSubmittedActions, actionOptions.length, isLoading, gameSetup, gamePath, loadHumanOptions]);

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
    const maxRounds = (gameSetup as any)?.maxRounds ?? GAME_CONFIG.MAX_ROUNDS;
    if (
      (gameState.round > maxRounds || (gameState.coreMetric.value <= 0 && gameState.round > 0)) &&
      gameState.phase !== GamePhase.END
    ) {
      setGameState((prev) => ({ ...prev, phase: GamePhase.END }));
    }
  }, [gameSetup, gameState.coreMetric.value, gameState.phase, gameState.round]);

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

  // NOTE: SSE connection is now managed by SessionMonitor component
  // This legacy SSE code has been removed to prevent duplicate subscriptions
  // See: ai-risk-ttx-113 (Remove legacy SSE stream from useGameController)

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
