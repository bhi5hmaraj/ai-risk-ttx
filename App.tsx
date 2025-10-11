import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  GameState,
  Player,
  RoleData,
  ActionOption,
  GameLogEntry,
  PlayerRoundActions,
  HiddenScoreUpdate,
  AIHiddenScoreUpdate,
  GameSetup,
  CoreMetric,
} from './types';
import { GamePhase } from './types';
import { ROLES, GAME_CONFIG } from './constants';
import { AI_SAFETY_SCENARIO } from './presets';
import {
  generateInitialScenario,
  generateConsequences,
  generateAIPlayerActions,
  generateActionOptions,
  generateCounterfactualConsequences,
  generateCustomScenario,
} from './services/geminiService';
import { LoadingSpinner, BeakerIcon } from './components/Icons';
import {
  RoundSnapshotCard,
  EventLog,
  ActionSelection,
  PlayerInfoPanel,
  GameStatusPanel,
  ActionTreeModal,
  RoleCard,
} from './components/game';
import { ACTION_TREE_STYLESHEET, buildActionTreeData } from './services/gameHelpers';

const DEFAULT_CORE_METRIC: CoreMetric = {
  name: 'Democratic Legitimacy',
  description: "The public's trust in the democratic process.",
  value: 100,
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export default function App() {
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
  const [aiCompletionStatus, setAiCompletionStatus] = useState<Record<string, boolean>>({});
  const [isActionTreeOpen, setIsActionTreeOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  const latestLogEntry = useMemo(
    () => (gameState.eventLog.length > 0 ? gameState.eventLog[gameState.eventLog.length - 1] : null),
    [gameState.eventLog]
  );

  const actionTreeData = useMemo(() => buildActionTreeData(gameState.eventLog), [gameState.eventLog]);
  const canViewActionTree = actionTreeData.elements.length > 0;
  const actionTreeModal = isActionTreeOpen && canViewActionTree ? (
    <ActionTreeModal
      isOpen
      onClose={() => setIsActionTreeOpen(false)}
      logEntry={actionTreeData.lastLogEntry}
      stylesheet={ACTION_TREE_STYLESHEET}
      elements={actionTreeData.elements}
    />
  ) : null;

  const humanPlayer = useMemo(() => players.find((p) => p.isHuman), [players]);

  const lastCompletedLogEntry = useMemo(
    () => gameState.eventLog.find((entry) => entry.round === gameState.round - 1) || null,
    [gameState.eventLog, gameState.round]
  );

  useEffect(() => {
    const phaseName = GamePhase[gameState.phase];
    console.log(`%c[STATE_TRANSITION] Game phase changed to: ${phaseName}`, 'color: #88aaff; font-weight: bold;');
  }, [gameState.phase]);

  useEffect(() => {
    if (!canViewActionTree && isActionTreeOpen) {
      setIsActionTreeOpen(false);
    }
  }, [canViewActionTree, isActionTreeOpen]);

  useEffect(() => {
    if (gameState.eventLog.length === 0) {
      setIsHistoryOpen(false);
    }
  }, [gameState.eventLog.length]);

  useEffect(() => {
    if (!isHistoryOpen) {
      setExpandedRound(null);
    }
  }, [isHistoryOpen]);

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

  const resetState = () => {
    console.log('[STATE_TRANSITION] Resetting game state to LOBBY.');
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
  };

  const handleCustomGameStart = async () => {
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
  };

  const runConsequencePhase = useCallback(
    async (currentPlayers: Player[], currentGameState: GameState) => {
      console.log(`[GAME_LOGIC] Running consequence phase for round ${currentGameState.round}.`);
      setIsLoading(true);

      let playersWithActions = [...currentPlayers];
      const aiPlayers = currentPlayers.filter((p) => !p.isHuman);

      const initialStatus = Object.fromEntries(aiPlayers.map((p) => [p.role.name, false]));
      setAiCompletionStatus(initialStatus);

      setLoadingMessage('AI Game Master is assessing the situation...');
      const counterfactualPromise = callGeminiAndCount(generateCounterfactualConsequences, currentGameState);

      const previousRoundLog = currentGameState.eventLog.find((entry) => entry.round === currentGameState.round - 1);
      const previousRoundActions = previousRoundLog ? previousRoundLog.playerActions : null;

      let aiActionOptionsResults: (Awaited<ReturnType<typeof generateActionOptions>> | null)[] = [];

      if (aiPlayers.length > 0) {
        const aiActionOptionsPromises = aiPlayers.map((player) => callGeminiAndCount(generateActionOptions, player, currentGameState, previousRoundActions));
        aiActionOptionsResults = await Promise.all(aiActionOptionsPromises);

        if (aiActionOptionsResults.some((r) => r === null)) {
          setError('Failed to generate action options for AI players. The simulation cannot continue.');
          setIsLoading(false);
          setLoadingMessage('');
          return;
        }

        setLoadingMessage('AI players are choosing their actions...');
        const aiActionChoicesPromises = aiPlayers.map((player, index) => {
          const options = aiActionOptionsResults[index]?.options || [];
          return callGeminiAndCount(generateAIPlayerActions, player, currentGameState, options).then((result) => {
            setAiCompletionStatus((prev) => ({ ...prev, [player.role.name]: true }));
            return result;
          });
        });
        const aiActionChoicesResults = await Promise.all(aiActionChoicesPromises);

        if (aiActionChoicesResults.some((r) => r === null)) {
          setError('Failed to generate actions for AI players. The simulation cannot continue.');
          setIsLoading(false);
          setLoadingMessage('');
          return;
        }

        const aiActionsByRole: Record<string, ActionOption[]> = {};
        aiPlayers.forEach((player, index) => {
          aiActionsByRole[player.role.name] = aiActionChoicesResults[index] || [];
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

      const result = await callGeminiAndCount(
        generateConsequences,
        currentGameState,
        playersWithActions,
        counterfactualResult.publicScoreUpdate
      );

      if (result) {
        const hiddenScoreUpdatesRecord = convertAiUpdatesToRecord(result.hiddenScoreUpdates);

        const playerActionsForLog: PlayerRoundActions[] = playersWithActions.map((p) => {
          let availableOptions: ActionOption[] = [];
          if (p.isHuman) {
            availableOptions = actionOptions;
          } else {
            const aiPlayerIndex = aiPlayers.findIndex((ap) => ap.id === p.id);
            if (aiPlayerIndex !== -1 && aiActionOptionsResults[aiPlayerIndex]) {
              availableOptions = aiActionOptionsResults[aiPlayerIndex]?.options || [];
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
              narrative: result.narrative,
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
        const newPlayers = playersWithActions.map((p) => ({
          ...p,
          hiddenScore: p.hiddenScore + (hiddenScoreUpdatesRecord[p.role.name]?.update || 0),
          actions: [],
          hasSubmittedActions: false,
        }));

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
      console.log(`[PLAYER_ACTION] Human player confirmed ${actions.length} action(s).`);
      const updatedPlayer = { ...humanPlayer, actions, hasSubmittedActions: true };
      const updatedPlayers = players.map((p) => (p.isHuman ? updatedPlayer : p));
      setPlayers(updatedPlayers);
      runConsequencePhase(updatedPlayers, gameState);
    },
    [gameState, humanPlayer, players, runConsequencePhase]
  );

  const buildRolesFromSetup = (setup: GameSetup): RoleData[] =>
    setup.stakeholders.map((stakeholder) => ({
      name: stakeholder.name,
      publicObjective: stakeholder.publicObjective,
      hiddenObjective: stakeholder.hiddenObjective,
      resources: stakeholder.resources ?? [],
      constraints: stakeholder.constraints ?? [],
      icon: (props) => <BeakerIcon {...props} />,
    }));

  const handleStartGame = () => {
    if (!selectedRoleName) return;
    const path = gamePath ?? 'classic';
    console.log(`[STATE_TRANSITION] Starting ${path} game, moving to STARTING phase.`);

    let roles: RoleData[] = [];
    let coreMetric: CoreMetric = { ...DEFAULT_CORE_METRIC };

    if (path === 'custom') {
      if (!gameSetup) {
        setError('Cannot start game without a generated scenario.');
        return;
      }
      roles = buildRolesFromSetup(gameSetup);
      const initial = Number.isFinite(gameSetup.coreMetric.initialValue)
        ? clampScore(gameSetup.coreMetric.initialValue)
        : 75;
      coreMetric = {
        name: gameSetup.coreMetric.name,
        description: gameSetup.coreMetric.description,
        value: initial,
      };
    } else if (path === 'ai_safety') {
      roles = AI_SAFETY_SCENARIO.stakeholders.map((stakeholder, index) => ({
        ...stakeholder,
        resources: stakeholder.resources ?? [],
        constraints: stakeholder.constraints ?? [],
        icon: (props) => <BeakerIcon key={`${stakeholder.name}_${index}`} {...props} />,
      }));
      coreMetric = {
        name: AI_SAFETY_SCENARIO.coreMetric.name,
        description: AI_SAFETY_SCENARIO.coreMetric.description,
        value: clampScore(AI_SAFETY_SCENARIO.coreMetric.initialValue),
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
  };

  const handleOpenActionTree = () => {
    if (canViewActionTree) {
      setIsActionTreeOpen(true);
    }
  };

  const handleToggleHistory = () => {
    setIsHistoryOpen((prev) => {
      const next = !prev;
      if (!next) {
        setExpandedRound(null);
      }
      return next;
    });
  };

  useEffect(() => {
    if (gameState.phase !== GamePhase.STARTING) return;

    const initializeClassicScenario = async () => {
      console.log('[GAME_LOGIC] Initializing classic scenario...');
      geminiCallsThisRoundRef.current = 0;
      const result = await callGeminiAndCount(generateInitialScenario);
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
              narrative: result.narrative,
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
      console.log(`[GAME_LOGIC] Initializing ${gamePath} scenario...`);
      geminiCallsThisRoundRef.current = 0;
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
            narrative: setup.scenarioDescription,
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
  }, [callGeminiAndCount, gamePath, gameSetup, gameState]);

  useEffect(() => {
    if (
      gameState.phase === GamePhase.ACTION &&
      humanPlayer &&
      !humanPlayer.hasSubmittedActions &&
      actionOptions.length === 0 &&
      !isLoading
    ) {
      console.log('[GAME_LOGIC] Generating action options for human player...');
      setIsLoading(true);
      setLoadingMessage('Generating action options...');
      geminiCallsThisRoundRef.current = 0;
      callGeminiAndCount(generateActionOptions, humanPlayer, gameState, lastCompletedLogEntry?.playerActions || null).then((res) => {
        if (res) {
          setActionOptions(res.options);
        } else {
          setError('Failed to generate action options. You may not be able to proceed.');
        }
        setIsLoading(false);
        setLoadingMessage('');
      });
    }
  }, [actionOptions.length, callGeminiAndCount, gameState, humanPlayer, isLoading, lastCompletedLogEntry]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (timer > 0 && gameState.phase === GamePhase.ACTION && !isPaused && !humanPlayer?.hasSubmittedActions) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer <= 0 && gameState.phase === GamePhase.ACTION && humanPlayer && !humanPlayer.hasSubmittedActions) {
      console.log('[GAME_LOGIC] Timer expired. Auto-submitting empty actions.');
      handleConfirmActions([]);
    }
    return () => clearInterval(interval);
  }, [gameState.phase, handleConfirmActions, humanPlayer, isPaused, timer]);

  useEffect(() => {
    if (
      (gameState.round > GAME_CONFIG.MAX_ROUNDS || (gameState.coreMetric.value <= 0 && gameState.round > 0)) &&
      gameState.phase !== GamePhase.END
    ) {
      console.log('[STATE_TRANSITION] Game ended. Moving to END phase.');
      setGameState((prev) => ({ ...prev, phase: GamePhase.END }));
    }
  }, [gameState.coreMetric.value, gameState.phase, gameState.round]);

  const renderExperienceBackButton = () => (
    <div className="max-w-7xl mx-auto mb-6 text-left">
      <button
        onClick={() => {
          setGamePath(null);
          setGameSetup(null);
          setSelectedRoleName(null);
        }}
        className="text-sm text-blue-300 hover:text-blue-200"
      >
        &larr; Choose a different experience
      </button>
    </div>
  );

  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <>
        {actionTreeModal}
        <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-blue-400">AI Election Crisis</h1>
          <p className="text-lg text-gray-300 mt-2 max-w-4xl mx-auto">A Tabletop Exercise in Strategic Decision-Making</p>
        </div>

        <div className="max-w-4xl mx-auto bg-gray-800/50 rounded-lg p-6 mb-10 border border-gray-700">
          <h2 className="text-2xl font-bold text-blue-300 mb-3">What is this?</h2>
          <div className="text-gray-300 space-y-4 text-left">
            <p>
              This is a <strong className="text-white">Tabletop Exercise (TTX)</strong>: a simulated crisis where you role-play as a key decision-maker. Think of it as a serious game designed to test your strategic thinking and reveal how complex systems respond to pressure.
            </p>
            <p>
              In this AI-powered simulation, you'll choose a role and face an escalating scenario. You must make tough choices with limited resources to advance your secret objectives while maintaining public trust. An <strong className="text-white">AI Game Master</strong> generates the story, controls the other characters, and shapes the consequences of your actions, ensuring a unique challenge every time. Your goal is to navigate the crisis and learn about high-stakes, multi-stakeholder decision-making.
            </p>
          </div>
        </div>

        {!gamePath ? (
          <div className="max-w-4xl mx-auto bg-gray-800/50 rounded-lg p-6 mb-10 border border-gray-700 text-center">
            <h2 className="text-3xl font-bold mb-6">Choose Your Experience</h2>
            <div className="flex flex-col md:flex-row justify-center items-center gap-6">
              <button
                onClick={() => {
                  setGamePath('classic');
                  setSelectedRoleName(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-200 w-full md:w-auto"
              >
                Classic Scenario (Election)
              </button>
              <button
                onClick={() => {
                  setGamePath('ai_safety');
                  setSelectedRoleName(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-200 w-full md:w-auto"
              >
                AI Safety Scenario
              </button>
              <button
                onClick={() => {
                  setGamePath('custom');
                  setSelectedRoleName(null);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-200 w-full md:w-auto"
              >
                Create Your Own
              </button>
            </div>
          </div>
        ) : gamePath === 'classic' ? (
          <>
            {renderExperienceBackButton()}
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold">Choose Your Role</h2>
            </div>
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.values(ROLES).map((role) => (
                  <RoleCard key={role.name} role={role} onSelect={() => setSelectedRoleName(role.name)} isSelected={selectedRoleName === role.name} />
                ))}
              </div>
              <div className="text-center mt-10">
                <button
                  onClick={handleStartGame}
                  disabled={!selectedRoleName}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-12 rounded-lg text-xl transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Start Simulation
                </button>
              </div>
            </div>
          </>
        ) : gamePath === 'ai_safety' ? (
          <>
            {renderExperienceBackButton()}
            <div className="max-w-4xl mx-auto bg-gray-800/50 rounded-lg p-6 mb-10 border border-gray-700 text-center">
              <h2 className="text-3xl font-bold text-red-300 mb-2">{AI_SAFETY_SCENARIO.scenarioTitle}</h2>
              <p className="text-gray-300">{AI_SAFETY_SCENARIO.scenarioDescription}</p>
            </div>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold">Choose Your Role</h2>
            </div>
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {AI_SAFETY_SCENARIO.stakeholders.map((role) => {
                  const roleData: RoleData = {
                    name: role.name,
                    publicObjective: role.publicObjective,
                    hiddenObjective: role.hiddenObjective,
                    resources: role.resources ?? [],
                    constraints: role.constraints ?? [],
                    icon: (props) => <BeakerIcon {...props} />,
                  };
                  return (
                    <RoleCard
                      key={role.name}
                      role={roleData}
                      onSelect={() => setSelectedRoleName(role.name)}
                      isSelected={selectedRoleName === role.name}
                    />
                  );
                })}
              </div>
              <div className="text-center mt-10">
                <button
                  onClick={handleStartGame}
                  disabled={!selectedRoleName}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-12 rounded-lg text-xl transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Start AI Safety Simulation
                </button>
              </div>
            </div>
          </>
        ) : gameSetup ? (
          <>
            {renderExperienceBackButton()}
            <div className="max-w-4xl mx-auto bg-gray-800/50 rounded-lg p-6 mb-10 border border-gray-700 text-center">
              <h2 className="text-3xl font-bold text-purple-300 mb-2">{gameSetup.scenarioTitle}</h2>
              <p className="text-gray-300">{gameSetup.scenarioDescription}</p>
            </div>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold">Choose Your Role</h2>
            </div>
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {gameSetup.stakeholders.map((role) => {
                  const roleData: RoleData = {
                    name: role.name,
                    publicObjective: role.publicObjective,
                    hiddenObjective: role.hiddenObjective,
                    resources: role.resources ?? [],
                    constraints: role.constraints ?? [],
                    icon: (props) => <BeakerIcon {...props} />,
                  };
                  return (
                    <RoleCard
                      key={role.name}
                      role={roleData}
                      onSelect={() => setSelectedRoleName(role.name)}
                      isSelected={selectedRoleName === role.name}
                    />
                  );
                })}
              </div>
              <div className="text-center mt-10">
                <button
                  onClick={handleStartGame}
                  disabled={!selectedRoleName}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-12 rounded-lg text-xl transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Start Custom Simulation
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {renderExperienceBackButton()}
            <div className="max-w-4xl mx-auto bg-gray-800/50 rounded-lg p-6 mb-10 border border-gray-700">
              <h2 className="text-3xl font-bold text-center mb-4">Describe Your Crisis Scenario</h2>
              <textarea
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
                placeholder="e.g., A coordinated drone attack takes down a major power grid..."
                className="w-full h-32 p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <div className="text-center mt-6">
                <button
                  onClick={handleCustomGameStart}
                  disabled={!customScenario || isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-12 rounded-lg text-xl transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Generating...' : 'Generate Scenario & Roles'}
                </button>
              </div>
              {error && <p className="text-red-400 text-center mt-4">{error}</p>}
            </div>
          </>
        )}
        </div>
      </>
    );
  }

  if (isLoading && gameState.phase !== GamePhase.ACTION) {
    return (
      <>
        {actionTreeModal}
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
          <LoadingSpinner />
          <p className="text-xl mt-4 text-blue-300">{loadingMessage}</p>
          {error && <p className="text-red-400 mt-4">{error}</p>}
        </div>
      </>
    );
  }

  if (gameState.phase === GamePhase.END) {
    return (
      <>
        {actionTreeModal}
        <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center justify-center">
          <h1 className="text-5xl font-extrabold text-blue-400 mb-4">Simulation Over</h1>
          <p className="text-lg text-gray-300 mb-8">
            Final {gameState.coreMetric.name}:{' '}
            <span className="text-2xl font-bold text-green-400">{gameState.coreMetric.value}%</span>
          </p>
        <div className="bg-gray-800 rounded-lg p-8 w-full max-w-4xl">
          <h2 className="text-3xl font-bold mb-6 text-center">Final Scores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {players
              .slice()
              .sort((a, b) => b.hiddenScore - a.hiddenScore)
              .map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    p.isHuman ? 'bg-blue-900/50 border border-blue-500' : 'bg-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    {p.role.icon({ className: 'h-8 w-8 mr-4 text-blue-300' })}
                    <span className="font-bold">{p.role.name}</span>
                  </div>
                  <span className="text-xl font-mono">{p.hiddenScore > 0 ? '+' : ''}{p.hiddenScore}</span>
                </div>
              ))}
          </div>
          </div>
          <button onClick={resetState} className="mt-10 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-12 rounded-lg text-xl">
            Play Again
          </button>
        </div>
      </>
    );
  }

  if (humanPlayer) {
    return (
      <>
        {actionTreeModal}
        <div className="min-h-screen bg-gray-900 p-4 md:p-6 lg:p-8">
          <div className="max-w-8xl mx-auto">
            {error && (
              <div className="bg-red-800/50 border border-red-500 text-red-300 p-4 rounded-lg mb-4 text-center">{error}</div>
            )}
            <GameStatusPanel gameState={gameState} timer={timer} isPaused={isPaused} onPauseClick={() => setIsPaused(!isPaused)} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3">
              <PlayerInfoPanel player={humanPlayer} />
            </div>
            <div className="lg:col-span-6 space-y-6">
              <RoundSnapshotCard
                gameState={gameState}
                latestLogEntry={latestLogEntry}
                onToggleHistory={handleToggleHistory}
                isHistoryOpen={isHistoryOpen}
                onViewActionTree={handleOpenActionTree}
                canViewActionTree={canViewActionTree}
              />
              {isHistoryOpen && (
                <EventLog
                  gameState={gameState}
                  players={players}
                  onViewActionTree={handleOpenActionTree}
                  canViewActionTree={canViewActionTree}
                  expandedRound={expandedRound}
                  setExpandedRound={setExpandedRound}
                />
              )}
            </div>
            <div className="lg:col-span-3">
              <ActionSelection
                key={gameState.round}
                options={actionOptions}
                onConfirm={handleConfirmActions}
                isLoading={isLoading && !humanPlayer.hasSubmittedActions}
                hasSubmitted={humanPlayer.hasSubmittedActions}
                isPaused={isPaused}
                players={players}
                aiCompletionStatus={aiCompletionStatus}
              />
            </div>
          </div>
        </div>
        </div>
      </>
    );
  }

  return (
    <>
      {actionTreeModal}
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <p className="text-red-500 text-2xl font-bold mb-4">{error || 'An unexpected error occurred.'}</p>
        <button onClick={resetState} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">
          Back to Home
        </button>
      </div>
    </>
  );
}
