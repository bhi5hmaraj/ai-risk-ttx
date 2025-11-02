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
import { AI_SAFETY_SCENARIO } from '../presets';
import {
  generateActionOptions,
  generateCounterfactualConsequences,
  generateCustomScenario,
  generateAITurn,
  generateInitialScenarioChat,
  generateConsequencesChat,
} from '../services/llmApiClient';

const DEFAULT_CORE_METRIC: CoreMetric = {
  name: 'Democratic Legitimacy',
  description: "The public's trust in the democratic process.",
  value: 100,
};

// clampScore imported from lib/gameLogic

export const useGameController = () => {
  const [gameState, setGameState] = useState<GameState>({
    phase: GamePhase.LOBBY,
    round: 0,
    coreMetric: { ...DEFAULT_CORE_METRIC },
    eventLog: [],
    currentEvent: null,
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedRoleName, setSelectedRoleName] = useState<string | null>(null);
  const [gamePath, setGamePath] = useState<'classic' | 'custom' | 'ai_safety' | null>(null);
  const [gameSetup, setGameSetup] = useState<GameSetup | null>(null);
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
    setGameState({ phase: GamePhase.LOBBY, round: 0, coreMetric: { ...DEFAULT_CORE_METRIC }, eventLog: [], currentEvent: null });
    setPlayers([]);
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
  }, []);

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
      let result;
      const cons = await callLLMAndCount(
        () => generateConsequencesChat(
          currentGameState,
          playersWithActions,
          counterfactualResult.publicScoreUpdate,
          chatHistoryRef.current || [],
          gameSetup!
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
      const updatedPlayer = { ...humanPlayer, actions, hasSubmittedActions: true };
      const updatedPlayers = players.map((p) => (p.isHuman ? updatedPlayer : p));
      setPlayers(updatedPlayers);
      runConsequencePhase(updatedPlayers, gameState);
    },
    [gameState, humanPlayer, players, runConsequencePhase]
  );

  const buildRolesFromSetup = useCallback((setup: GameSetup): RoleData[] =>
    setup.stakeholders.map((stakeholder) => {
      const emoji = stakeholder.icon || '❓';
      const EmojiIcon = (props: React.SVGProps<SVGSVGElement>) =>
        React.createElement('span', {
          className: 'text-2xl',
          role: 'img',
          'aria-label': 'role icon'
        }, emoji);

      return {
        name: stakeholder.name,
        publicObjective: stakeholder.publicObjective,
        hiddenObjective: stakeholder.hiddenObjective,
        resources: stakeholder.resources ?? [],
        constraints: stakeholder.constraints ?? [],
        icon: EmojiIcon,
      };
    }),
  []);

  const handleStartGame = useCallback(() => {
    if (!selectedRoleName) return;
    const path = gamePath ?? 'classic';

    let roles: RoleData[] = [];
    let coreMetric: CoreMetric = { ...DEFAULT_CORE_METRIC };

    if (path === 'custom') {
      if (!gameSetup) {
        setError('Cannot start game without a generated scenario.');
        return;
      }
      roles = buildRolesFromSetup(gameSetup);
      const initial = Number.isFinite(gameSetup.coreMetric.value)
        ? clampScore(gameSetup.coreMetric.value)
        : 75;
      coreMetric = {
        name: gameSetup.coreMetric.name,
        description: gameSetup.coreMetric.description,
        value: initial,
      };
    } else if (path === 'ai_safety') {
      roles = buildRolesFromSetup(AI_SAFETY_SCENARIO);
      coreMetric = {
        name: AI_SAFETY_SCENARIO.coreMetric.name,
        description: AI_SAFETY_SCENARIO.coreMetric.description,
        value: clampScore(AI_SAFETY_SCENARIO.coreMetric.value),
      };
    } else {
      roles = Object.values(ROLES);
      coreMetric = { ...DEFAULT_CORE_METRIC };
    }

    // Determine AI subset based on config
    const humanRole = roles.find((r) => r.name === selectedRoleName)!;
    const aiPool = roles.filter((r) => r.name !== selectedRoleName);
    const limitedAI = aiPool.slice(0, Math.max(0, Math.min(GAME_CONFIG.MAX_AI_PLAYERS, aiPool.length)));
    const orderedRoles: RoleData[] = [humanRole, ...limitedAI];

    const initialPlayers: Player[] = orderedRoles.map((role, index) => ({
      id: role.name === selectedRoleName ? 'human_player' : `ai_${index}`,
      role,
      isHuman: role.name === selectedRoleName,
      hiddenScore: 0,
      actionPoints: GAME_CONFIG.INITIAL_ACTION_POINTS,
      actions: [],
      hasSubmittedActions: false,
    }));

    setPlayers(initialPlayers);
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
  }, [selectedRoleName, gamePath, gameSetup, buildRolesFromSetup]);

  useEffect(() => {
    if (gameState.phase !== GamePhase.STARTING) return;

    const initializeClassicScenario = async () => {
      llmCallsThisRoundRef.current = 0;

      // Chat mode only: Create and persist canonical setup, then call chat endpoint
      const setup = gameSetup || {
        scenarioTitle: 'Election Crisis 2024',
        scenarioDescription: 'A rapidly escalating crisis threatens democratic legitimacy.',
        coreMetric: gameState.coreMetric,
        stakeholders: players.map(p => ({
          name: p.role.name,
          icon: '🎭',
          publicObjective: p.role.publicObjective,
          hiddenObjective: p.role.hiddenObjective,
          resources: p.role.resources,
          constraints: p.role.constraints,
        })),
      };
      setGameSetup(setup);

      const initChat = await callLLMAndCount(() => generateInitialScenarioChat(setup, players));
      const result = initChat ? initChat.scenario : null;
      if (initChat) chatHistoryRef.current = initChat.chatHistory;

      if (result) {
        const initialGameState = createInitialGameStateFromScenario(gameState, result, llmCallsThisRoundRef.current);
        setTimer(GAME_CONFIG.ACTION_PHASE_SECONDS);
        setGameState(initialGameState);
        setIsLoading(false);
        setLoadingMessage('');
      } else {
        setError('The AI Game Master failed to initialize the game. Please refresh and try again.');
        setGameState((prev) => ({ ...prev, phase: GamePhase.LOBBY }));
        setIsLoading(false);
        setLoadingMessage('');
      }
    };

    const initializePresetScenario = (setup: GameSetup) => {
      llmCallsThisRoundRef.current = 0;

      // Persist canonical setup for AI Safety / predefined scenarios
      setGameSetup(setup);

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
          const res = await callLLMAndCount(
            generateActionOptions,
            humanPlayer,
            gameState,
            lastCompletedLogEntry?.playerActions || null
          );
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
  }, [actionOptions.length, callLLMAndCount, gameState, humanPlayer, isLoading, lastCompletedLogEntry]);

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

  useEffect(() => {
    if (!isHistoryOpen) {
      setExpandedRound(null);
    }
  }, [isHistoryOpen]);

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
      setGameSetup,
      setCustomScenario,
      setExpandedRound,
      setIsActionTreeOpen,
      setIsPaused,
      handleCustomGameStart,
      handleStartGame,
      handleConfirmActions,
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
