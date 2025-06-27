import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { GameState, Player, RoleData, RoleName, ActionOption, GameLogEntry, PlayerRoundActions, HiddenScoreUpdate, AIHiddenScoreUpdate } from './types';
import { GamePhase } from './types';
import { ROLES, GAME_CONFIG } from './constants';
import { generateInitialScenario, generateConsequences, generateAIPlayerActions, generateActionOptions } from './services/geminiService';
import { LoadingSpinner, CheckCircleIcon, EyeIcon, EyeSlashIcon, PauseIcon, PlayIcon } from './components/Icons';

// --- HELPER COMPONENTS ---

const RoleCard: React.FC<{ role: RoleData; onSelect: () => void; isSelected: boolean; }> = ({ role, onSelect, isSelected }) => (
  <div className={`bg-gray-800 rounded-lg p-6 border-2 transition-all duration-300 ease-in-out ${isSelected ? 'border-blue-500 shadow-lg scale-105' : 'border-gray-700 hover:border-blue-600'}`}>
    <div className="flex items-center mb-4">
      <div className="bg-gray-700 p-2 rounded-md mr-4">
        {role.icon({ className: "h-8 w-8 text-blue-400" })}
      </div>
      <h3 className="text-2xl font-bold text-white">{role.name}</h3>
    </div>
    <p className="text-gray-400 mb-2 text-sm">Public: {role.publicObjective}</p>
    <button onClick={onSelect} disabled={isSelected} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:bg-gray-600 disabled:cursor-not-allowed">
      {isSelected ? <><CheckCircleIcon className="h-5 w-5 mr-2" /> Selected</> : 'Select Role'}
    </button>
  </div>
);

const PlayerInfoPanel: React.FC<{ player: Player }> = ({ player }) => {
  const [showHidden, setShowHidden] = useState(false);
  return (
    <div className="bg-gray-800 rounded-lg p-6 sticky top-6">
      <div className="flex items-center mb-4">
        <div className="bg-gray-700 p-3 rounded-md mr-4">
          {player.role.icon({ className: "h-10 w-10 text-blue-400" })}
        </div>
        <div>
          <h2 className="text-2xl font-bold">{player.role.name}</h2>
          <span className="text-sm text-blue-400 font-semibold">Your Role</span>
        </div>
      </div>
      <div className="space-y-4 text-sm">
        <p><strong className="text-blue-300">Public Objective:</strong> {player.role.publicObjective}</p>
        <div className="bg-gray-900 p-3 rounded-md border border-gray-700">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowHidden(!showHidden)}>
                <strong className="text-amber-300">Hidden Objective</strong>
                {showHidden ? <EyeSlashIcon className="h-5 w-5 text-gray-400" /> : <EyeIcon className="h-5 w-5 text-gray-400" />}
            </div>
            {showHidden && <p className="mt-2 text-amber-200 italic">{player.role.hiddenObjective}</p>}
        </div>
        <p><strong className="text-blue-300">Personal Score:</strong> {player.hiddenScore}</p>
      </div>
    </div>
  );
};

const GameStatusPanel: React.FC<{ 
    gameState: GameState; 
    timer: number; 
    isPaused: boolean;
    onPauseClick: () => void;
}> = ({ gameState, timer, isPaused, onPauseClick }) => (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <div className='w-full md:w-1/3 text-center md:text-left'><span className="font-bold text-xl">Round:</span> <span className="text-2xl text-blue-400">{gameState.round} / {GAME_CONFIG.MAX_ROUNDS}</span></div>
        <div className="text-center w-full md:w-1/3">
            <div className="font-bold text-xl">Democratic Legitimacy</div>
            <div className={`text-4xl font-bold ${gameState.publicScore > 60 ? 'text-green-400' : gameState.publicScore > 30 ? 'text-yellow-400' : 'text-red-400'}`}>{gameState.publicScore}%</div>
        </div>
        <div className='w-full md:w-1/3 text-center md:text-right flex items-center justify-center md:justify-end space-x-4'>
            <div>
                <span className="font-bold text-xl">{isPaused ? 'Paused' : 'Time Left:'}</span>
                {!isPaused && <span className="text-2xl text-blue-400 ml-2">{Math.floor(timer/60)}:{(timer % 60).toString().padStart(2, '0')}</span>}
            </div>
            {gameState.phase === GamePhase.ACTION && (
                <button onClick={onPauseClick} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors" aria-label={isPaused ? "Resume game" : "Pause game"}>
                    {isPaused ? <PlayIcon className="h-6 w-6 text-white" /> : <PauseIcon className="h-6 w-6 text-white" />}
                </button>
            )}
        </div>
    </div>
);

const EventLog: React.FC<{ gameState: GameState }> = ({ gameState }) => (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6 max-h-[50vh] overflow-y-auto">
        {gameState.eventLog.slice().reverse().map((log, index) => (
            <div key={index} className="border-b border-gray-700 pb-4 last:border-b-0">
                {log.round > 0 ? (
                    <>
                        <h3 className="text-xl font-bold text-blue-400 mb-2">Round {log.round} Outcome</h3>
                         <div className="flex justify-between items-center text-sm text-gray-400 mb-2 border-b border-t border-gray-700 py-2">
                            <span>
                                Democratic Legitimacy: <strong className="text-lg text-white">{log.publicScoreAfter}%</strong>
                                <span className={`ml-2 font-bold ${log.publicScoreChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ({log.publicScoreChange >= 0 ? '+' : ''}{log.publicScoreChange})
                                </span>
                            </span>
                            { log.geminiCalls > 0 && 
                                <span>
                                    Gemini Calls: <strong className="text-lg text-white">{log.geminiCalls}</strong>
                                </span>
                            }
                        </div>
                        <div className="bg-gray-900/50 p-3 rounded-md my-2 border border-gray-700">
                           <p className="font-bold text-red-400">{log.event?.headline}</p>
                           <p className="text-gray-300 text-sm mt-1">{log.event?.detail}</p>
                        </div>
                    </>
                ) : (
                   <>
                        <h3 className="text-xl font-bold text-blue-400 mb-2">Opening Scenario</h3>
                         <div className="flex justify-between items-center text-sm text-gray-400 mb-2 border-b border-t border-gray-700 py-2">
                            <span>
                                Democratic Legitimacy: <strong className="text-lg text-white">{log.publicScoreAfter}%</strong>
                            </span>
                            { log.geminiCalls > 0 && 
                                <span>
                                    Gemini Calls: <strong className="text-lg text-white">{log.geminiCalls}</strong>
                                </span>
                            }
                        </div>
                   </>
                )}
                
                <p className="bg-gray-900/50 p-3 rounded-md text-gray-400 italic"><strong>Narrative:</strong> {log.narrative}</p>

                {log.playerActions && log.playerActions.length > 0 && (
                    <div className="mt-4">
                        <h4 className="font-bold text-lg text-gray-300 mb-2">Actions &amp; Outcomes:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {log.playerActions.map(playerAction => {
                                const role = ROLES[playerAction.roleName];
                                const scoreChange = log.hiddenScoreChanges[playerAction.roleName];
                                if (!role) return null;
                                return (
                                    <div key={playerAction.roleName} className="bg-gray-900/70 p-3 rounded-md border border-gray-700 flex flex-col">
                                        <div className="flex items-center mb-2">
                                            {role.icon({ className: "h-6 w-6 mr-3 text-blue-400" })}
                                            <span className="font-bold text-white">{playerAction.roleName}</span>
                                        </div>
                                        <ul className="space-y-1 text-sm text-gray-400 flex-grow">
                                            {playerAction.actions.length > 0 ? (
                                                playerAction.actions.map((action, i) => (
                                                    <li key={i} className="flex justify-between items-start">
                                                        <span className='mr-2'>- {action.title}</span>
                                                        <span className="flex-shrink-0 text-xs font-mono bg-gray-700 text-blue-300 px-1.5 py-0.5 rounded">
                                                            {action.cost} AP
                                                        </span>
                                                    </li>
                                                ))
                                            ) : (
                                                <li><em>No action taken.</em></li>
                                            )}
                                        </ul>
                                        {scoreChange && (
                                            <div className="mt-3 pt-3 border-t border-gray-700/50">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-bold text-gray-300">Personal Score:</span>
                                                    <span className={`font-bold text-lg ${scoreChange.update >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {scoreChange.update >= 0 ? '+' : ''}{scoreChange.update}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-amber-300/80 italic mt-1">
                                                    <span className="font-bold">Justification:</span> {scoreChange.justification}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        ))}
    </div>
);


const ActionSelection: React.FC<{
    options: ActionOption[],
    onConfirm: (actions: ActionOption[]) => void,
    isLoading: boolean,
    hasSubmitted: boolean,
    isPaused: boolean,
}> = ({ options, onConfirm, isLoading, hasSubmitted, isPaused }) => {
    const [selected, setSelected] = useState<ActionOption[]>([]);
    const pointsUsed = useMemo(() => selected.reduce((acc, curr) => acc + curr.cost, 0), [selected]);
    const pointsRemaining = GAME_CONFIG.ACTION_POINTS_PER_ROUND - pointsUsed;

    const toggleAction = (option: ActionOption) => {
        if(hasSubmitted || isPaused) return;
        const isSelected = selected.some(s => s.title === option.title);
        if (isSelected) {
            setSelected(selected.filter(s => s.title !== option.title));
        } else {
            if (pointsRemaining >= option.cost) {
                setSelected([...selected, option]);
            }
        }
    };
    
    if (hasSubmitted) {
        return (
            <div className="bg-gray-800 rounded-lg p-6 sticky top-6 text-center">
                <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Actions Submitted</h3>
                <p className="text-gray-400">Waiting for AI opponents...</p>
            </div>
        );
    }
    
    return (
        <div className="bg-gray-800 rounded-lg p-6 sticky top-6 relative">
             {isPaused && (
                <div className="absolute inset-0 bg-gray-800/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
                    <PauseIcon className="h-12 w-12 text-blue-400 mb-4" />
                    <h3 className="text-xl font-bold">Game Paused</h3>
                </div>
            )}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Your Actions</h3>
                <div className="text-right">
                    <div className="font-bold text-lg text-blue-400">{pointsRemaining}</div>
                    <div className="text-sm text-gray-400">Points Left</div>
                </div>
            </div>
            {isLoading && !options.length ? <div className="flex justify-center items-center h-48"><LoadingSpinner/></div> :
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {options.map((opt) => {
                    const isSelected = selected.some(s => s.title === opt.title);
                    const canSelect = pointsRemaining >= opt.cost;
                    return (
                        <div key={opt.title} onClick={() => toggleAction(opt)}
                            className={`p-3 rounded-md border-2 transition-all cursor-pointer 
                                ${isSelected ? 'border-blue-500 bg-blue-900/50' : (!canSelect && !isSelected) ? 'border-gray-700 bg-gray-800 opacity-60 cursor-not-allowed' : 'border-gray-700 hover:border-blue-400 bg-gray-900/50'}`}>
                            <div className="flex justify-between font-bold">
                                <span>{opt.title}</span>
                                <span className="text-blue-300">Cost: {opt.cost}</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{opt.description}</p>
                        </div>
                    );
                })}
            </div>
            }
            <button onClick={() => onConfirm(selected)} disabled={isLoading || selected.length === 0 || isPaused}
                className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:bg-gray-600 disabled:cursor-not-allowed">
                Confirm Actions
            </button>
        </div>
    );
};


// --- MAIN APP COMPONENT ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    phase: GamePhase.LOBBY, round: 0, publicScore: 100, eventLog: [], currentEvent: null,
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedRoleName, setSelectedRoleName] = useState<RoleName | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(GAME_CONFIG.ACTION_PHASE_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const geminiCallsThisRoundRef = useRef(0);

  const [actionOptions, setActionOptions] = useState<ActionOption[]>([]);

  const humanPlayer = useMemo(() => players.find(p => p.isHuman), [players]);

  // Effect to log phase transitions
  useEffect(() => {
    const phaseName = GamePhase[gameState.phase];
    console.log(`%c[STATE_TRANSITION] Game phase changed to: ${phaseName}`, 'color: #88aaff; font-weight: bold;');
  }, [gameState.phase]);


  // Helper to convert the API's array response to the Record used in the app's state
  const convertAiUpdatesToRecord = (updates: AIHiddenScoreUpdate[]): Record<RoleName, HiddenScoreUpdate> => {
      return Object.fromEntries(
          updates.map(item => [item.roleName, { update: item.update, justification: item.justification }])
      ) as Record<RoleName, HiddenScoreUpdate>;
  };

  // Wrapper for API calls to count them per round
  const callGeminiAndCount = useCallback(async <T extends (...args: any[]) => Promise<any>>(
    apiFunc: T, ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>> | null> => {
      geminiCallsThisRoundRef.current += 1;
      const result = await apiFunc(...args);
      if (result === null) {
          setError(`An API call to Gemini failed. Check the console for details.`);
          return null;
      }
      return result;
  }, []);

  const resetState = () => {
    console.log('[STATE_TRANSITION] Resetting game state to LOBBY.');
    setGameState({ phase: GamePhase.LOBBY, round: 0, publicScore: 100, eventLog: [], currentEvent: null });
    setPlayers([]);
    setSelectedRoleName(null);
    setIsLoading(false);
    setError(null);
    setActionOptions([]);
    setIsPaused(false);
    geminiCallsThisRoundRef.current = 0;
  };

  const runConsequencePhase = useCallback(async (currentPlayers: Player[], currentGameState: GameState) => {
    console.log(`[GAME_LOGIC] Running consequence phase for round ${currentGameState.round}.`);
    setIsLoading(true);
    setLoadingMessage("AI players are deciding their moves...");
    
    let playersWithActions = [...currentPlayers];
    const aiPlayers = currentPlayers.filter(p => !p.isHuman);

    if (aiPlayers.length > 0) {
        const aiActionPromises = aiPlayers.map(player =>
            callGeminiAndCount(generateAIPlayerActions, player, currentGameState)
        );
        const aiActionsResults = await Promise.all(aiActionPromises);

        // If any AI action generation fails, stop the phase
        if (aiActionsResults.some(r => r === null)) {
            setError("Failed to generate actions for AI players. The simulation cannot continue.");
            setIsLoading(false);
            setLoadingMessage('');
            return;
        }

        const aiActionsByRole: Record<string, ActionOption[]> = {};
        aiPlayers.forEach((player, index) => {
            aiActionsByRole[player.role.name] = aiActionsResults[index] || [];
        });

        playersWithActions = currentPlayers.map(p => {
            if (!p.isHuman && aiActionsByRole[p.role.name]) {
                return { ...p, actions: aiActionsByRole[p.role.name], hasSubmittedActions: true };
            }
            return p;
        });
    }
    
    setPlayers(playersWithActions);
    
    setLoadingMessage("AI Game Master is processing the consequences...");
    const result = await callGeminiAndCount(generateConsequences, currentGameState, playersWithActions);
    
    if (result) {
        const hiddenScoreUpdatesRecord = convertAiUpdatesToRecord(result.hiddenScoreUpdates);

        const playerActionsForLog: PlayerRoundActions[] = playersWithActions.map(p => ({
            roleName: p.role.name,
            actions: p.actions,
            isHuman: p.isHuman,
        }));

        const newPublicScore = Math.max(0, Math.min(100, currentGameState.publicScore + result.publicScoreUpdate));

        const newGameState: GameState = {
            ...currentGameState,
            phase: GamePhase.ACTION,
            round: currentGameState.round + 1,
            publicScore: newPublicScore,
            eventLog: [
                ...currentGameState.eventLog, 
                { 
                    round: currentGameState.round, 
                    narrative: result.narrative, 
                    event: currentGameState.currentEvent,
                    playerActions: playerActionsForLog,
                    publicScoreChange: result.publicScoreUpdate,
                    publicScoreAfter: newPublicScore,
                    hiddenScoreChanges: hiddenScoreUpdatesRecord,
                    geminiCalls: geminiCallsThisRoundRef.current,
                }
            ],
            currentEvent: result.nextEvent
        };
        const newPlayers = playersWithActions.map(p => ({
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
    } else {
        setError("The AI Game Master failed to provide a consequence. The simulation cannot continue.");
        setIsLoading(false);
        setLoadingMessage('');
    }
  }, [callGeminiAndCount]);

  const handleConfirmActions = useCallback((actions: ActionOption[]) => {
      if(!humanPlayer) return;
      console.log(`[PLAYER_ACTION] Human player confirmed ${actions.length} action(s).`);
      const updatedPlayer = {...humanPlayer, actions, hasSubmittedActions: true};
      const updatedPlayers = players.map(p => p.isHuman ? updatedPlayer : p);
      setPlayers(updatedPlayers);
      runConsequencePhase(updatedPlayers, gameState);
  }, [humanPlayer, players, runConsequencePhase, gameState]);

  const handleStartGame = () => {
    if (!selectedRoleName) return;
    console.log('[STATE_TRANSITION] Starting game, moving to STARTING phase.');
    const allRoles = Object.values(ROLES);
    const initialPlayers: Player[] = allRoles.map((role, index) => ({
      id: role.name === selectedRoleName ? 'human_player' : `ai_${index}`,
      role,
      isHuman: role.name === selectedRoleName,
      hiddenScore: 0,
      actions: [],
      hasSubmittedActions: false,
    }));
    setPlayers(initialPlayers);
    setGameState(prev => ({ ...prev, phase: GamePhase.STARTING }));
    setIsLoading(true);
    setLoadingMessage("AI Game Master is generating the initial scenario...");
  };
  
  // --- Game Loop Management ---

  // Effect to handle initial scenario generation
  useEffect(() => {
    if (gameState.phase !== GamePhase.STARTING) return;

    const initializeScenario = async () => {
        console.log('[GAME_LOGIC] Initializing scenario...');
        geminiCallsThisRoundRef.current = 0;
        const result = await callGeminiAndCount(generateInitialScenario);
        if (result) {
            const hiddenScoreUpdatesRecord = convertAiUpdatesToRecord(result.hiddenScoreUpdates);
            const newPublicScore = Math.max(0, Math.min(100, gameState.publicScore + result.publicScoreUpdate));
            const initialGameState: GameState = {
                ...gameState,
                phase: GamePhase.ACTION,
                round: 1,
                publicScore: newPublicScore,
                currentEvent: result.nextEvent,
                eventLog: [{
                    round: 0,
                    narrative: result.narrative,
                    event: null,
                    playerActions: [],
                    publicScoreChange: result.publicScoreUpdate,
                    publicScoreAfter: newPublicScore,
                    hiddenScoreChanges: hiddenScoreUpdatesRecord,
                    geminiCalls: geminiCallsThisRoundRef.current,
                }]
            };
            setTimer(GAME_CONFIG.ACTION_PHASE_SECONDS);
            setGameState(initialGameState);
            setIsLoading(false);
            setLoadingMessage('');
        } else {
            setError("The AI Game Master failed to initialize the game. Please refresh and try again.");
            setGameState(prev => ({ ...prev, phase: GamePhase.LOBBY }));
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    initializeScenario();
  }, [gameState.phase, callGeminiAndCount, gameState.publicScore]);


  // Effect for generating action options for the player
  useEffect(() => {
    if (gameState.phase === GamePhase.ACTION && humanPlayer && !humanPlayer.hasSubmittedActions && actionOptions.length === 0 && !isLoading) {
        console.log('[GAME_LOGIC] Generating action options for human player...');
        setIsLoading(true);
        setLoadingMessage("Generating action options...");
        geminiCallsThisRoundRef.current = 0; // Reset for the new action phase
        callGeminiAndCount(generateActionOptions, humanPlayer, gameState).then(res => {
            if (res) {
              setActionOptions(res.options);
            } else {
              setError("Failed to generate action options. You may not be able to proceed.");
            }
            setIsLoading(false);
            setLoadingMessage('');
        });
    }
  }, [gameState.round, gameState.phase, humanPlayer, actionOptions.length, callGeminiAndCount, isLoading]);

  // Effect for the round timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (timer > 0 && gameState.phase === GamePhase.ACTION && !isPaused && !humanPlayer?.hasSubmittedActions) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer <= 0 && gameState.phase === GamePhase.ACTION && humanPlayer && !humanPlayer.hasSubmittedActions) {
      console.log('[GAME_LOGIC] Timer expired. Auto-submitting empty actions.');
      handleConfirmActions([]); // Auto-submit when timer runs out
    }
    return () => clearInterval(interval);
  }, [timer, gameState.phase, isPaused, humanPlayer, handleConfirmActions]);
  
  // Effect to check for game end condition
  useEffect(() => {
    if ((gameState.round > GAME_CONFIG.MAX_ROUNDS || (gameState.publicScore <= 0 && gameState.round > 0)) && gameState.phase !== GamePhase.END) {
        console.log('[STATE_TRANSITION] Game ended. Moving to END phase.');
        setGameState(prev => ({...prev, phase: GamePhase.END}));
    }
  }, [gameState.round, gameState.publicScore, gameState.phase]);


  // --- RENDER LOGIC ---

  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-blue-400">AI Election Crisis</h1>
          <p className="text-lg text-gray-300 mt-2">Choose Your Role</p>
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.values(ROLES).map(role => (
              <RoleCard key={role.name} role={role} onSelect={() => setSelectedRoleName(role.name)} isSelected={selectedRoleName === role.name} />
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={handleStartGame} disabled={!selectedRoleName} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-12 rounded-lg text-xl transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed">
              Start Simulation
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (isLoading && gameState.phase !== GamePhase.ACTION) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
            <LoadingSpinner />
            <p className="text-xl mt-4 text-blue-300">{loadingMessage}</p>
            {error && <p className="text-red-400 mt-4">{error}</p>}
        </div>
    );
  }

  if (gameState.phase === GamePhase.END) {
     return (
        <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center justify-center">
            <h1 className="text-5xl font-extrabold text-blue-400 mb-4">Simulation Over</h1>
            <p className="text-lg text-gray-300 mb-8">Final Democratic Legitimacy: <span className="text-2xl font-bold text-green-400">{gameState.publicScore}%</span></p>
            <div className="bg-gray-800 rounded-lg p-8 w-full max-w-4xl">
                 <h2 className="text-3xl font-bold mb-6 text-center">Final Scores</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {players.sort((a,b) => b.hiddenScore - a.hiddenScore).map(p => (
                         <div key={p.id} className={`flex items-center justify-between p-4 rounded-lg ${p.isHuman ? 'bg-blue-900/50 border border-blue-500' : 'bg-gray-700'}`}>
                             <div className="flex items-center">
                                {p.role.icon({ className: "h-8 w-8 mr-4 text-blue-300"})}
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
     );
  }
  
  if (humanPlayer) {
    return (
      <div className="min-h-screen bg-gray-900 p-4 md:p-6 lg:p-8">
        <div className="max-w-8xl mx-auto">
          {error && <div className="bg-red-800/50 border border-red-500 text-red-300 p-4 rounded-lg mb-4 text-center">{error}</div>}
          <GameStatusPanel gameState={gameState} timer={timer} isPaused={isPaused} onPauseClick={() => setIsPaused(!isPaused)} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3">
              <PlayerInfoPanel player={humanPlayer} />
            </div>
            <div className="lg:col-span-6 space-y-6">
               <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-red-400 mb-2">{gameState.currentEvent?.headline}</h3>
                    <p className="text-gray-300">{gameState.currentEvent?.detail}</p>
                </div>
               <EventLog gameState={gameState} />
            </div>
            <div className="lg:col-span-3">
                <ActionSelection 
                    key={gameState.round}
                    options={actionOptions} 
                    onConfirm={handleConfirmActions} 
                    isLoading={isLoading} 
                    hasSubmitted={humanPlayer.hasSubmittedActions} 
                    isPaused={isPaused}
                />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <p className="text-red-500 text-2xl font-bold mb-4">{error || "An unexpected error occurred."}</p>
      <button onClick={resetState} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">
          Back to Home
      </button>
    </div>
  );
}