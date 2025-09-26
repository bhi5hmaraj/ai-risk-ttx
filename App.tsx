import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { GameState, Player, RoleData, ActionOption, RoleName, GameLogEntry, PlayerRoundActions, HiddenScoreUpdate, AIHiddenScoreUpdate } from './types';
import { GamePhase } from './types';
import { ROLES, GAME_CONFIG } from './constants';
import { LoadingSpinner, CheckCircleIcon, EyeIcon, EyeSlashIcon, PauseIcon, PlayIcon } from './components/Icons';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
// Removed gameStore import - using server state via WebSocket
import * as apiService from './src/services/apiService';
import { connect, disconnect, getConnectionStatus, setGameStateCallback } from './src/services/websocketService';

// --- HELPER COMPONENTS (Can be moved to their own files) ---

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

const CombinedActionTree: React.FC<{ logEntry: GameLogEntry | null }> = ({ logEntry }) => {
    const elements = useMemo(() => {
        if (!logEntry || !logEntry.event || logEntry.playerActions.length === 0) {
            return [];
        }

        const nodes: cytoscape.ElementDefinition[] = [];
        const edges: cytoscape.ElementDefinition[] = [];

        // Event Node (Root)
        nodes.push({ data: { id: 'event', label: logEntry.event.headline }, classes: 'event' });

        logEntry.playerActions.forEach(pa => {
            const roleId = pa.roleName;
            const chosenActionTitles = new Set(pa.actions.map(a => a.title));
            
            // Role Node
            nodes.push({ data: { id: roleId, label: roleId }, classes: 'role' });
            edges.push({ data: { source: 'event', target: roleId }, classes: 'event-edge' });
            
            // Action Nodes and Edges
            if (pa.availableOptions) {
                pa.availableOptions.forEach(opt => {
                    const actionId = `${roleId}_${opt.title}`;
                    const isChosen = chosenActionTitles.has(opt.title);
                    
                    nodes.push({
                        data: { id: actionId, label: opt.title },
                        classes: isChosen ? 'action chosen' : 'action unchosen'
                    });
                    
                    edges.push({
                        data: { source: roleId, target: actionId },
                        classes: isChosen ? 'edge chosen-edge' : 'edge unchosen-edge'
                    });
                });
            }
        });

        return [...nodes, ...edges];
    }, [logEntry]);

    const stylesheet: cytoscape.Stylesheet[] = [
        { selector: 'node', style: { 'label': 'data(label)', 'text-valign': 'center', 'text-halign': 'center', 'color': '#fff', 'font-size': '10px', 'text-wrap': 'wrap', 'text-max-width': '120px', 'shape': 'round-rectangle', 'width': '130px', 'height': 'auto', 'padding': '10px', 'background-opacity': 1 } },
        { selector: '.event', style: { 'background-color': '#be123c', 'font-weight': 'bold', 'font-size': '14px', 'color': 'white' } },
        { selector: '.role', style: { 'background-color': '#1d4ed8', 'font-weight': 'bold', 'font-size': '12px' } },
        { selector: '.action', style: { 'font-size': '9px', 'width': '100px', 'height': 'auto', 'padding': '8px' } },
        { selector: '.chosen', style: { 'background-color': '#16a34a', 'border-width': '2px', 'border-color': '#22c55e' } },
        { selector: '.unchosen', style: { 'background-color': '#4b5563', 'opacity': 0.7 } },
        { selector: 'edge', style: { 'width': 2, 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
        { selector: '.event-edge', style: { 'line-color': '#4b5563' , 'target-arrow-color': '#4b5563'} },
        { selector: '.chosen-edge', style: { 'line-color': '#22c55e', 'target-arrow-color': '#22c55e', 'width': 3, 'z-index': 99 } },
        { selector: '.unchosen-edge', style: { 'line-color': '#4b5563', 'target-arrow-color': '#4b5563', 'opacity': 0.6 } }
    ];
    
    if (elements.length === 0) {
        return (
            <div className="bg-gray-800 rounded-lg p-6 mt-6">
                <h3 className="text-lg font-bold text-blue-300 mb-2">Round Action Tree</h3>
                <p className="text-gray-400 text-sm">The action tree for the first round will appear here after it concludes.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg p-4 mt-6 h-[50vh]">
            <h3 className="text-lg font-bold text-blue-300 mb-2 text-center">Round {logEntry?.round} Action Tree</h3>
            <CytoscapeComponent 
                elements={elements} 
                stylesheet={stylesheet} 
                layout={{ name: 'cose', animate: true, padding: 20, nodeRepulsion: 400000, idealEdgeLength: 100, nodeOverlap: 20, gravity: 80, numIter: 1000, initialTemp: 200, coolingFactor: 0.95, minTemp: 1.0 }}
                style={{ width: '100%', height: 'calc(100% - 30px)' }} 
                cy={(cy) => { cy.maxZoom(1.5); cy.minZoom(0.3); }}
            />
        </div>
    );
};

const PlayerInfoPanel: React.FC<{ player: Player; lastLogEntry: GameLogEntry | null }> = ({ player, lastLogEntry }) => {
  const [showHidden, setShowHidden] = useState(false);
  return (
    <div className="sticky top-6">
      <div className="bg-gray-800 rounded-lg p-6">
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
      <CombinedActionTree logEntry={lastLogEntry} />
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
                {!isPaused && <span className={`text-2xl text-blue-400 ml-2 font-mono ${timer <= 30 && timer > 0 ? 'timer-flash' : ''}`}>{Math.floor(timer/60)}:{(timer % 60).toString().padStart(2, '0')}</span>}
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
        {gameState.eventLog.slice().reverse().map((log) => (
            <div key={log.round} className="border-b border-gray-700 pb-4 last:border-b-0 animate-fade-in">
                {log.round > 0 ? (
                    <>
                        <h3 className="text-xl font-bold text-blue-400 mb-2">Round {log.round} Outcome</h3>
                         <div className="flex justify-between items-center text-sm text-gray-400 mb-2 border-b border-t border-gray-700 py-2">
                            <span>
                                Democratic Legitimacy: <strong className="text-lg text-white">{log.publicScoreAfter}%</strong>
                                <span className={`ml-2 font-bold score-change-animate ${log.publicScoreChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                <p className="bg-gray-900/50 p-3 rounded-md text-gray-300 italic whitespace-pre-wrap"><strong>Narrative:</strong> {log.narrative}</p>
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
                <p className="text-gray-400">Waiting for other players...</p>
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
  const [gameState, setGameState] = useState<GameState | null>(null);

  const [selectedRoleName, setSelectedRoleName] = useState<RoleName | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(GAME_CONFIG.ACTION_PHASE_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const [wsStatus, setWsStatus] = useState<string>('disconnected');
  const [actionOptions, setActionOptions] = useState<ActionOption[]>([]);

  const humanPlayer = useMemo(() => {
    if (!gameState?.players) return null;
    const player = gameState.players.find(p => p.is_human);
    if (!player) return null;
    
    // Convert to frontend Player format
    return {
      id: player.id,
      role: ROLES[player.role_name as RoleName],
      isHuman: player.is_human,
      hiddenScore: player.hidden_score,
      actions: player.actions || [],
      hasSubmittedActions: player.has_submitted_actions
    };
  }, [gameState?.players]);

  const lastCompletedLogEntry = useMemo(
    () => gameState?.eventLog.find(entry => entry.round === (gameState.round - 1)) || null,
    [gameState?.eventLog, gameState?.round]
  );

  // Effect to set up WebSocket game state callback
  useEffect(() => {
    setGameStateCallback((newGameState) => {
      console.log('WebSocket updating game state:', newGameState);
      setGameState(newGameState);
    });
    
    // Debug current state
    console.log('Current game state:', gameState);
    console.log('Selected role name:', selectedRoleName);
  }, []);

  // Effect to manage WebSocket connection
  useEffect(() => {
    if (gameState?.id) {
      console.log('Connecting WebSocket for game:', gameState.id);
      connect(gameState.id);
    }
    return () => {
      console.log('Cleaning up WebSocket connection');
      disconnect();
    };
  }, [gameState?.id]);

  // Effect to monitor WebSocket connection status
  useEffect(() => {
    const checkStatus = () => {
      setWsStatus(getConnectionStatus());
    };
    
    checkStatus(); // Check initial status
    const interval = setInterval(checkStatus, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, [gameState?.id]);

  // Effect to fetch action options when in ACTION phase
  useEffect(() => {
    const fetchActionOptions = async () => {
      if (gameState?.phase === GamePhase.ACTION && humanPlayer?.id && !humanPlayer.hasSubmittedActions) {
        try {
          setIsLoading(true);
          setLoadingMessage('Generating action options...');
          const response = await apiService.getActionOptions(gameState.id, humanPlayer.id);
          setActionOptions(response.options);
        } catch (err) {
          console.error('Error fetching action options:', err);
          setError('Failed to load action options. Please refresh and try again.');
        } finally {
          setIsLoading(false);
          setLoadingMessage('');
        }
      }
    };

    fetchActionOptions();
  }, [gameState?.phase, gameState?.id, humanPlayer?.id, humanPlayer?.hasSubmittedActions]);

  const handleSelectRole = (roleName: RoleName) => {
    setSelectedRoleName(roleName);
  };

  const handleCreateGame = async () => {
    if (!selectedRoleName) return;
    setIsLoading(true);
    setLoadingMessage('Creating game...');
    setError(null); // Clear any previous errors
    try {
      console.log('Creating game with role:', selectedRoleName);
      const newGame = await apiService.createGame(selectedRoleName.toString());
      console.log('Game created:', newGame);
      setGameState(newGame);
      
      // Automatically start the game since all players are already created
      if (newGame.id) {
        setLoadingMessage('Starting game...');
        const startedGame = await apiService.startGame(newGame.id);
        console.log('Game started:', startedGame);
        setGameState(startedGame);
      }
    } catch (err) {
      console.error('Error creating/starting game:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStartGame = async () => {
    if (!gameState?.id) return;
    setIsLoading(true);
    setLoadingMessage('Starting game...');
    setError(null);
    try {
      await apiService.startGame(gameState.id);
      console.log('Game started');
      // The WebSocket will send a game_state_update
    } catch (err) {
      console.error('Error starting game:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmActions = async (actions: ActionOption[]) => {
    if (!gameState?.id || !humanPlayer?.id) return;
    setIsLoading(true);
    setLoadingMessage('Submitting actions...');
    setError(null);
    try {
      const actionIds = actions.map(a => a.id);
      await apiService.submitActions(gameState.id, humanPlayer.id, actionIds);
      console.log('Actions submitted');
      // The WebSocket will send a game_state_update when processing is complete
    } catch (err) {
      console.error('Error submitting actions:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Timer effect remains similar, but driven by global state
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (gameState?.phase === GamePhase.ACTION && !isPaused && !humanPlayer?.hasSubmittedActions) {
      // This timer is now purely cosmetic. The server is the source of truth for time.
      interval = setInterval(() => setTimer(t => t > 0 ? t - 1 : 0), 1000);
    }
    return () => clearInterval(interval);
  }, [gameState?.phase, isPaused, humanPlayer?.hasSubmittedActions]);

  if (isLoading) {
    return <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-900 text-white"><LoadingSpinner /> <p className="mt-4 text-lg">{loadingMessage}</p></div>;
  }



  if (!gameState || gameState.phase === GamePhase.LOBBY) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-blue-400">AI Election Crisis</h1>
          <p className="text-lg text-gray-300 mt-2">Choose Your Role</p>
        </div>
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="bg-red-800/50 border border-red-500 text-red-300 p-4 rounded-lg mb-6 text-center">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.values(ROLES).map(role => (
              <RoleCard key={role.name} role={role} onSelect={() => handleSelectRole(role.name)} isSelected={selectedRoleName === role.name} />
            ))}
          </div>
          <div className="text-center mt-10">
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                console.log('Create Game button clicked, selectedRole:', selectedRoleName);
                handleCreateGame();
              }} 
              disabled={!selectedRoleName || isLoading} 
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-12 rounded-lg text-xl transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Creating...' : 'Start Simulation'}
            </button>
          </div>
        </div>
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
                     {gameState.players.sort((a,b) => b.hidden_score - a.hidden_score).map(p => (
                         <div key={p.id} className={`flex items-center justify-between p-4 rounded-lg ${p.is_human ? 'bg-blue-900/50 border border-blue-500' : 'bg-gray-700'}`}>
                             <div className="flex items-center">
                                {ROLES[p.role_name as RoleName]?.icon({ className: "h-8 w-8 mr-4 text-blue-300"})}
                                <span className="font-bold">{p.role_name}</span>
                             </div>
                             <span className="text-xl font-mono">{p.hidden_score > 0 ? '+' : ''}{p.hidden_score}</span>
                         </div>
                     ))}
                 </div>
            </div>
            <button onClick={() => window.location.reload()} className="mt-10 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-12 rounded-lg text-xl">
              Play Again
            </button>
        </div>
     );
  }

  // Main Game View
  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-8xl mx-auto">
        {error && <div className="bg-red-800/50 border border-red-500 text-red-300 p-4 rounded-lg mb-4 text-center">{error}</div>}
        <GameStatusPanel gameState={gameState} timer={timer} isPaused={isPaused} onPauseClick={() => setIsPaused(!isPaused)} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3">
            {humanPlayer && <PlayerInfoPanel player={humanPlayer} lastLogEntry={lastCompletedLogEntry} />}
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
                  isLoading={isLoading && !humanPlayer.hasSubmittedActions} 
                  hasSubmitted={humanPlayer.hasSubmittedActions} 
                  isPaused={isPaused}
              />
          </div>
        </div>
      </div>
    </div>
  );
}