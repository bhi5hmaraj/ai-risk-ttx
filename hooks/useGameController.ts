import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  GameState,
  Player,
  RoleData,
  ActionOption,
  GameLogEntry,
  HiddenScoreUpdate,
  AIHiddenScoreUpdate,
  GameSetup,
  CoreMetric,
  PlayerRoundActions,
} from '../types';
import { GamePhase } from '../types';
import { ROLES, GAME_CONFIG } from '../constants';
import { AI_SAFETY_SCENARIO } from '../presets';
import {
  generateInitialScenario,
  generateConsequences,
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

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

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
  const geminiCallsThisRoundRef = useRef(0);
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

  const convertAiUpdatesToRecord = (updates: AIHiddenScoreUpdate[]): Record<string, HiddenScoreUpdate> => {
    return Object.fromEntries(updates.map((item) => [item.roleName, { update: item.update, justification: item.justification }]));
  };

  const callGeminiAndCount = useCallback(
    async <T extends (...args: any[]) => Promise<any>>(apiFunc: T, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | null> => {
      geminiCallsThisRoundRef.current += 1;
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
    geminiCallsThisRoundRef.current = 0;
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
      const counterfactualPromise = callGeminiAndCount(generateCounterfactualConsequences, currentGameState);

      const previousRoundLog = currentGameState.eventLog.find((entry) => entry.round === currentGameState.round - 1);
      const previousRoundActions = previousRoundLog ? previousRoundLog.playerActions : null;

      // OPTIMIZED: Use single generateAITurn call instead of separate options + actions
      let aiTurnResults: (Awaited<ReturnType<typeof generateAITurn>> | null)[] = [];

      if (aiPlayers.length > 0) {
        setLoadingMessage('AI players are analyzing and choosing their actions...');
        const aiTurnPromises = aiPlayers.map((player) =>
          callGeminiAndCount(generateAITurn, player, currentGameState, previousRoundActions).then((result) => {
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

      // Use chat mode if enabled and history exists
      let result;
      if (GAME_CONFIG.USE_CHAT_MODE && chatHistoryRef.current && gameSetup) {
        const chatResult = await callGeminiAndCount(
          () => generateConsequencesChat(
            currentGameState,
            playersWithActions,
            counterfactualResult.publicScoreUpdate,
            chatHistoryRef.current!,
            gameSetup
          )
        );

        if (chatResult) {
          result = chatResult.consequences;
          chatHistoryRef.current = chatResult.chatHistory;
        } else {
          // Fallback to stateless consequence generation if chat mode fails
          result = await callGeminiAndCount(
            generateConsequences,
            currentGameState,
            playersWithActions,
            counterfactualResult.publicScoreUpdate
          );
        }
      } else {
        result = await callGeminiAndCount(
          generateConsequences,
          currentGameState,
          playersWithActions,
          counterfactualResult.publicScoreUpdate
        );
      }

      if (result) {
        const hiddenScoreUpdatesRecord = convertAiUpdatesToRecord(result.hiddenScoreUpdates);

        const playerActionsForLog: PlayerRoundActions[] = playersWithActions.map((p) => {
          let availableOptions: ActionOption[] = [];
          if (p.isHuman) {
            availableOptions = actionOptions;
          } else {
            const aiPlayerIndex = aiPlayers.findIndex((ap) => ap.id === p.id);
            if (aiPlayerIndex !== -1 && aiTurnResults[aiPlayerIndex]) {
              availableOptions = aiTurnResults[aiPlayerIndex]?.options || [];
            }
          }
          return {
            roleName: p.role.name,
            actions: p.actions,
            availableOptions,
            isHuman: p.isHuman,
          };
        });

        const newScoreValue = clampScore(currentGameState.coreMetric.value + result.publicScoreUpdate);

        const newGameState: GameState = {
          ...currentGameState,
          phase: GamePhase.ACTION,
          round: currentGameState.round + 1,
          coreMetric: { ...currentGameState.coreMetric, value: newScoreValue },
          eventLog: [
            ...currentGameState.eventLog,
            {
              round: currentGameState.round,
              roundSummary: result.roundSummary,
              outcomeTimeline: result.outcomeTimeline ?? [],
              counterfactualNote: result.counterfactualNote ?? '',
              event: currentGameState.currentEvent,
              playerActions: playerActionsForLog,
              publicScoreChange: result.publicScoreUpdate,
              publicScoreAfter: newScoreValue,
              hiddenScoreChanges: hiddenScoreUpdatesRecord,
              geminiCalls: geminiCallsThisRoundRef.current,
            },
          ],
          currentEvent: result.nextEvent,
        };
        const newPlayers = playersWithActions.map((p) => {
          const pointsSpent = p.actions.reduce((sum, action) => sum + action.cost, 0);
          const newPoints = Math.min(
            p.actionPoints - pointsSpent + GAME_CONFIG.ACTION_POINTS_PER_ROUND,
            GAME_CONFIG.MAX_ACTION_POINTS
          );
          return {
            ...p,
            hiddenScore: p.hiddenScore + (hiddenScoreUpdatesRecord[p.role.name]?.update || 0),
            actionPoints: newPoints,
            actions: [],
            hasSubmittedActions: false,
          };
        });

        setTimer(GAME_CONFIG.ACTION_PHASE_SECONDS);
        setGameState(newGameState);
        setPlayers(newPlayers);
        setActionOptions([]);
        setIsLoading(false);
        setLoadingMessage('');
        setAiCompletionStatus({});
        geminiCallsThisRoundRef.current = 0;
      } else {
        setError('The AI Game Master failed to provide a consequence. The simulation cannot continue.');
        setIsLoading(false);
        setLoadingMessage('');
      }
    },
    [actionOptions, callGeminiAndCount]
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

    const initialPlayers: Player[] = roles.map((role, index) => ({
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
      geminiCallsThisRoundRef.current = 0;

      // Use chat mode if enabled
      let result;
      if (GAME_CONFIG.USE_CHAT_MODE) {
        // Create game setup for chat mode
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

        const chatResult = await callGeminiAndCount(() => generateInitialScenarioChat(setup, players));

        if (chatResult) {
          result = chatResult.scenario;
          chatHistoryRef.current = chatResult.chatHistory;
        } else {
          result = null;
        }
      } else {
        result = await callGeminiAndCount(generateInitialScenario);
      }

      if (result) {
        const hiddenScoreUpdatesRecord = convertAiUpdatesToRecord(result.hiddenScoreUpdates);
        const newScoreValue = clampScore(gameState.coreMetric.value + result.publicScoreUpdate);
        const initialGameState: GameState = {
          ...gameState,
          phase: GamePhase.ACTION,
          round: 1,
          coreMetric: { ...gameState.coreMetric, value: newScoreValue },
          currentEvent: result.nextEvent,
          eventLog: [
            {
              round: 0,
              roundSummary: result.roundSummary,
              outcomeTimeline: result.outcomeTimeline ?? [],
              counterfactualNote: result.counterfactualNote ?? '',
              event: null,
              playerActions: [],
              publicScoreChange: result.publicScoreUpdate,
              publicScoreAfter: newScoreValue,
              hiddenScoreChanges: hiddenScoreUpdatesRecord,
              geminiCalls: geminiCallsThisRoundRef.current,
            },
          ],
        };
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
      geminiCallsThisRoundRef.current = 0;

      // Initialize chat history for preset scenarios if chat mode is enabled
      // The backend will create the system prompt on first request
      if (GAME_CONFIG.USE_CHAT_MODE) {
        chatHistoryRef.current = [];
      }

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
  }, [callGeminiAndCount, gamePath, gameSetup, gameState, runConsequencePhase]);

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
        geminiCallsThisRoundRef.current = 0;
        try {
          const res = await callGeminiAndCount(
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
  }, [actionOptions.length, callGeminiAndCount, gameState, humanPlayer, isLoading, lastCompletedLogEntry]);

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
