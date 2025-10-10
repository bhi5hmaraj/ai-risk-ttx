import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import {
  LoadingSpinner,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  PauseIcon,
  PlayIcon,
  CloseIcon,
  BeakerIcon,
} from './components/Icons';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre);

const ACTION_TREE_STYLESHEET: cytoscape.Stylesheet[] = [
  { selector: 'node', style: { label: 'data(label)', 'text-valign': 'center', 'text-halign': 'center', color: '#fff', 'font-size': '10px', 'text-wrap': 'wrap', 'text-max-width': '120px', shape: 'round-rectangle', width: '130px', height: 'auto', padding: '10px', 'background-opacity': 1 } as any },
  { selector: '.event', style: { 'background-color': '#be123c', 'font-weight': 'bold', 'font-size': '14px', color: 'white' } },
  { selector: '.role', style: { 'background-color': '#1d4ed8', 'font-weight': 'bold', 'font-size': '12px' } },
  { selector: '.action', style: { 'font-size': '9px', width: '100px', height: 'auto', padding: '8px' } as any },
  { selector: '.chosen', style: { 'background-color': '#16a34a', 'border-width': '2px', 'border-color': '#22c55e' } },
  { selector: '.unchosen', style: { 'background-color': '#4b5563', opacity: 0.7 } },
  { selector: 'edge', style: { width: 2, 'target-arrow-shape': 'triangle', 'curve-style': 'bezier' } },
  { selector: '.event-edge', style: { 'line-color': '#4b5563', 'target-arrow-color': '#4b5563' } },
  { selector: '.chosen-edge', style: { 'line-color': '#22c55e', 'target-arrow-color': '#22c55e', width: 3, 'z-index': 99 } },
  { selector: '.unchosen-edge', style: { 'line-color': '#4b5563', 'target-arrow-color': '#4b5563', opacity: 0.6 } },
];

const buildActionTreeData = (eventLog: GameLogEntry[]) => {
  const nodes: cytoscape.ElementDefinition[] = [];
  const edges: cytoscape.ElementDefinition[] = [];
  let lastEventId: string | null = null;

  eventLog.forEach((log) => {
    if (!log.event) return;

    const eventId = `event_${log.round}`;
    nodes.push({ data: { id: eventId, label: log.event.headline }, classes: 'event' });

    if (lastEventId) {
      edges.push({ data: { source: lastEventId, target: eventId }, classes: 'event-edge' });
    }

    log.playerActions.forEach((pa) => {
      const roleId = `${pa.roleName}_${log.round}`;
      nodes.push({ data: { id: roleId, label: pa.roleName }, classes: 'role' });
      edges.push({ data: { source: eventId, target: roleId }, classes: 'event-edge' });

      pa.availableOptions?.forEach((opt) => {
        const actionId = `${roleId}_${opt.title}`;
        const isChosen = pa.actions.some((a) => a.title === opt.title);

        nodes.push({
          data: { id: actionId, label: opt.title },
          classes: isChosen ? 'action chosen' : 'action unchosen',
        });

        edges.push({
          data: { source: roleId, target: actionId },
          classes: isChosen ? 'edge chosen-edge' : 'edge unchosen-edge',
        });
      });
    });
    lastEventId = eventId;
  });

  const lastLogEntry = eventLog.length > 0 ? eventLog[eventLog.length - 1] : null;
  return { elements: [...nodes, ...edges], lastLogEntry };
};

const RoleCard: React.FC<{ role: RoleData; onSelect: () => void; isSelected: boolean; }> = ({ role, onSelect, isSelected }) => (
  <div className={`bg-gray-800 rounded-lg p-6 border-2 transition-all duration-300 ease-in-out ${isSelected ? 'border-blue-500 shadow-lg scale-105' : 'border-gray-700 hover:border-blue-600'}`}>
    <div className="flex items-center mb-4">
      <div className="bg-gray-700 p-2 rounded-md mr-4">
        {role.icon({ className: 'h-8 w-8 text-blue-400' })}
      </div>
      <h3 className="text-2xl font-bold text-white">{role.name}</h3>
    </div>
    <p className="text-gray-400 mb-2 text-sm">Public: {role.publicObjective}</p>
    <button
      onClick={onSelect}
      disabled={isSelected}
      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:bg-gray-600 disabled:cursor-not-allowed"
    >
      {isSelected ? (
        <>
          <CheckCircleIcon className="h-5 w-5 mr-2" /> Selected
        </>
      ) : (
        'Select Role'
      )}
    </button>
  </div>
);

const ActionTreeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  logEntry: GameLogEntry | null;
  stylesheet: cytoscape.Stylesheet[];
  elements: cytoscape.ElementDefinition[];
}> = ({ isOpen, onClose, logEntry, stylesheet, elements }) => {
  if (!isOpen) return null;
  const cyRef = useRef<cytoscape.Core | null>(null);

  const handleResetView = () => {
    if (cyRef.current) {
      cyRef.current.fit();
      cyRef.current.center();
    }
  };

  useEffect(() => {
    if (isOpen && cyRef.current) {
      const layout = cyRef.current.layout({ name: 'dagre', rankDir: 'TB', spacingFactor: 1.2 } as any);
      layout.run();
      cyRef.current.fit();
      cyRef.current.center();
    }
  }, [isOpen, elements]);

  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-blue-500 rounded-lg w-full h-full max-w-7xl max-h-[90vh] p-4 flex flex-col">
        <div className="flex justify-between items-center mb-2 flex-shrink-0">
          <h3 className="text-xl font-bold text-blue-300">Full Action Tree (Round {logEntry?.round})</h3>
          <div className="flex items-center space-x-2">
            <button onClick={handleResetView} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded-md text-xs">
              Reset View
            </button>
            <button onClick={onClose} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600">
              <CloseIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
        <div className="flex-grow h-full w-full">
          <CytoscapeComponent
            elements={elements}
            stylesheet={stylesheet}
            layout={{ name: 'dagre', rankDir: 'TB', spacingFactor: 1.2 } as any}
            style={{ width: '100%', height: '100%' }}
            cy={(cy) => {
              if (cyRef.current !== cy) {
                cyRef.current = cy;
                cy.maxZoom(2);
                cy.minZoom(0.1);
                cy.fit();
                cy.center();
              }
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

const PlayerInfoPanel: React.FC<{ player: Player }> = ({ player }) => {
  const [showHidden, setShowHidden] = useState(false);
  return (
    <div className="sticky top-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="bg-gray-700 p-3 rounded-md mr-4">
            {player.role.icon({ className: 'h-10 w-10 text-blue-400' })}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{player.role.name}</h2>
            <span className="text-sm text-blue-400 font-semibold">Your Role</span>
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <p>
            <strong className="text-blue-300">Public Objective:</strong> {player.role.publicObjective}
          </p>
          <div className="bg-gray-900 p-3 rounded-md border border-gray-700">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowHidden(!showHidden)}>
              <strong className="text-amber-300">Hidden Objective</strong>
              {showHidden ? <EyeSlashIcon className="h-5 w-5 text-gray-400" /> : <EyeIcon className="h-5 w-5 text-gray-400" />}
            </div>
            {showHidden && <p className="mt-2 text-amber-200 italic">{player.role.hiddenObjective}</p>}
          </div>
          {player.role.resources.length > 0 && (
            <div>
              <strong className="text-blue-300">Resources:</strong>
              <ul className="mt-1 text-gray-300 list-disc list-inside space-y-1">
                {player.role.resources.map((resource) => (
                  <li key={resource}>{resource}</li>
                ))}
              </ul>
            </div>
          )}
          {player.role.constraints.length > 0 && (
            <div>
              <strong className="text-blue-300">Constraints:</strong>
              <ul className="mt-1 text-gray-300 list-disc list-inside space-y-1">
                {player.role.constraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
            </div>
          )}
          <p>
            <strong className="text-blue-300">Personal Score:</strong> {player.hiddenScore}
          </p>
        </div>
      </div>
    </div>
  );
};

const GameStatusPanel: React.FC<{
  gameState: GameState;
  timer: number;
  isPaused: boolean;
  onPauseClick: () => void;
}> = ({ gameState, timer, isPaused, onPauseClick }) => {
  const metricValue = gameState.coreMetric.value;
  const metricClass = metricValue > 60 ? 'text-green-400' : metricValue > 30 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
      <div className="w-full md:w-1/3 text-center md:text-left">
        <span className="font-bold text-xl">Round:</span>{' '}
        <span className="text-2xl text-blue-400">
          {gameState.round} / {GAME_CONFIG.MAX_ROUNDS}
        </span>
      </div>
      <div className="text-center w-full md:w-1/3">
        <div className="font-bold text-xl">{gameState.coreMetric.name}</div>
        <div className={`text-4xl font-bold ${metricClass}`}>{metricValue}%</div>
      </div>
      <div className="w-full md:w-1/3 text-center md:text-right flex items-center justify-center md:justify-end space-x-4">
        <div>
          <span className="font-bold text-xl">{isPaused ? 'Paused' : 'Time Left:'}</span>
          {!isPaused && (
            <span className={`text-2xl text-blue-400 ml-2 font-mono ${timer <= 30 && timer > 0 ? 'timer-flash' : ''}`}>
              {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
        {gameState.phase === GamePhase.ACTION && (
          <button
            onClick={onPauseClick}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
          >
            {isPaused ? <PlayIcon className="h-6 w-6 text-white" /> : <PauseIcon className="h-6 w-6 text-white" />}
          </button>
        )}
      </div>
    </div>
  );
};

const EventLog: React.FC<{
  gameState: GameState;
  players: Player[];
  onViewActionTree: () => void;
  canViewActionTree: boolean;
}> = ({ gameState, players, onViewActionTree, canViewActionTree }) => {
  const metricName = gameState.coreMetric.name;
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  const reversedLog = useMemo(() => gameState.eventLog.slice().reverse(), [gameState.eventLog]);

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4 max-h-[50vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-blue-300">Event Log</h3>
        <button
          onClick={onViewActionTree}
          disabled={!canViewActionTree}
          className={`text-sm font-semibold px-3 py-1 rounded-md transition-colors ${
            canViewActionTree ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          View Action Tree
        </button>
      </div>

      {reversedLog.map((log) => {
        const isExpanded = expandedRound === log.round;
        const scoreDelta = log.publicScoreChange;
        const deltaLabel = log.round > 0 ? `${scoreDelta >= 0 ? '+' : ''}${scoreDelta}` : null;

        return (
          <div key={log.round} className="rounded-lg border border-gray-700 bg-gray-900/40">
            <button
              type="button"
              onClick={() => setExpandedRound(isExpanded ? null : log.round)}
              className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div>
                <p className="font-semibold text-white">
                  {log.round > 0 ? `Round ${log.round} Outcome` : 'Opening Scenario'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {metricName}: <span className="text-white font-semibold">{log.publicScoreAfter}%</span>
                  {deltaLabel && (
                    <span className={`ml-2 font-semibold ${scoreDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>({deltaLabel})</span>
                  )}
                </p>
                {log.event?.headline && (
                  <p className="text-xs text-gray-500 mt-1 truncate">{log.event.headline}</p>
                )}
              </div>
              <span className="text-blue-300 text-xl font-bold" aria-hidden="true">
                {isExpanded ? '−' : '+'}
              </span>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-4">
                {log.round > 0 && (
                  <div className="flex items-center justify-between text-sm text-gray-400 border-y border-gray-800 py-2">
                    <span>
                      {metricName}: <strong className="text-lg text-white">{log.publicScoreAfter}%</strong>
                      {deltaLabel && (
                        <span className={`ml-2 font-bold ${scoreDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>({deltaLabel})</span>
                      )}
                    </span>
                    {log.geminiCalls > 0 && (
                      <span>
                        AI Calls: <strong className="text-lg text-white">{log.geminiCalls}</strong>
                      </span>
                    )}
                  </div>
                )}

                {log.event && (
                  <div className="bg-gray-900/60 p-3 rounded-md border border-gray-800">
                    <p className="font-bold text-red-400">{log.event.headline}</p>
                    <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">{log.event.detail}</p>
                  </div>
                )}

                {log.playerActions && log.playerActions.length > 0 && (
                  <div>
                    <h4 className="font-bold text-sm text-gray-300 uppercase tracking-wider mb-2">Actions &amp; Outcomes</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {log.playerActions.map((playerAction) => {
                        const matchingPlayer = players.find((p) => p.role.name === playerAction.roleName);
                        const roleIcon = matchingPlayer?.role.icon ?? ((props: React.SVGProps<SVGSVGElement>) => <BeakerIcon {...props} />);
                        const scoreChange = log.hiddenScoreChanges[playerAction.roleName];
                        return (
                          <div key={`${playerAction.roleName}_${log.round}`} className="bg-gray-900/70 p-3 rounded-md border border-gray-800 flex flex-col">
                            <div className="flex items-center mb-2">
                              {roleIcon({ className: 'h-6 w-6 mr-3 text-blue-400' })}
                              <span className="font-bold text-white">{playerAction.roleName}</span>
                            </div>
                            <ul className="space-y-1 text-sm text-gray-400 flex-grow">
                              {playerAction.actions.length > 0 ? (
                                playerAction.actions.map((action, index) => (
                                  <li key={index} className="flex justify-between items-start">
                                    <span className="mr-2 leading-snug">{action.title}</span>
                                    <span className="flex-shrink-0 inline-flex items-center text-xs font-semibold bg-gray-800 text-blue-300 px-2 py-0.5 rounded-full">
                                      {action.cost} AP
                                    </span>
                                  </li>
                                ))
                              ) : (
                                <li className="italic text-gray-500">No action taken.</li>
                              )}
                            </ul>
                            {scoreChange && (
                              <div className="mt-3 pt-3 border-t border-gray-800 text-sm">
                                {playerAction.isHuman ? (
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-300">Personal Score</span>
                                    <span className={`font-bold ${scoreChange.update >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {scoreChange.update >= 0 ? '+' : ''}
                                      {scoreChange.update}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-300">Personal Score</span>
                                    <span className={`font-semibold italic ${
                                      scoreChange.update > 0 ? 'text-green-400' : scoreChange.update < 0 ? 'text-red-400' : 'text-gray-400'
                                    }`}>
                                      {scoreChange.update !== 0 ? 'Changed' : 'No Change'}
                                    </span>
                                  </div>
                                )}
                                <p className="text-xs text-amber-300/80 italic mt-2">
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

                <div className="bg-gray-900/50 p-3 rounded-md text-gray-300 italic whitespace-pre-wrap">
                  <strong>Narrative:</strong> {log.narrative}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const RoundSnapshotCard: React.FC<{
  gameState: GameState;
  latestLogEntry: GameLogEntry | null;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  onViewActionTree: () => void;
  canViewActionTree: boolean;
}> = ({ gameState, latestLogEntry, onToggleHistory, isHistoryOpen, onViewActionTree, canViewActionTree }) => {
  const metric = gameState.coreMetric;
  const lastDelta = latestLogEntry?.publicScoreChange ?? null;
  const narrativePreview = latestLogEntry?.narrative
    ? latestLogEntry.narrative.length > 160
      ? `${latestLogEntry.narrative.slice(0, 160).trim()}…`
      : latestLogEntry.narrative
    : 'Play your first round to see how the story evolves.';

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-blue-300">Round {Math.max(gameState.round, 1)}</p>
          <h2 className="text-2xl font-bold text-white mt-1">
            {gameState.currentEvent?.headline ?? 'Awaiting next event'}
          </h2>
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">
            {gameState.currentEvent?.detail ?? 'Once the AI Game Master processes the round, the next crisis beat will appear here.'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-400">{metric.name}</p>
            <p className="text-3xl font-semibold text-blue-300">{metric.value}%</p>
            {lastDelta !== null && gameState.round > 0 && (
              <p className={`text-sm font-semibold ${lastDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {lastDelta >= 0 ? '+' : ''}
                {lastDelta}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={onToggleHistory}
              className="px-3 py-1 rounded-md text-sm font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              {isHistoryOpen ? 'Hide History' : 'View History'}
            </button>
            <button
              onClick={onViewActionTree}
              disabled={!canViewActionTree}
              className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                canViewActionTree ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Action Tree
            </button>
          </div>
        </div>
      </div>
      <div className="bg-gray-900/60 rounded-md p-4 border border-gray-800">
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Latest Outcomes</p>
        <p className="text-sm text-gray-300 leading-relaxed">{narrativePreview}</p>
      </div>
    </div>
  );
};

const ActionSelection: React.FC<{
  options: ActionOption[];
  onConfirm: (actions: ActionOption[]) => void;
  isLoading: boolean;
  hasSubmitted: boolean;
  isPaused: boolean;
  players: Player[];
  aiCompletionStatus: Record<string, boolean>;
}> = ({ options, onConfirm, isLoading, hasSubmitted, isPaused, players, aiCompletionStatus }) => {
  const [selected, setSelected] = useState<ActionOption[]>([]);
  const pointsUsed = useMemo(() => selected.reduce((acc, curr) => acc + curr.cost, 0), [selected]);
  const pointsRemaining = GAME_CONFIG.ACTION_POINTS_PER_ROUND - pointsUsed;
  const aiPlayers = useMemo(() => players.filter((p) => !p.isHuman), [players]);
  const allAIsDone = useMemo(() => aiPlayers.every((p) => aiCompletionStatus[p.role.name]), [aiPlayers, aiCompletionStatus]);
  const confirmDisabled = isLoading || selected.length === 0 || isPaused;

  const toggleAction = (option: ActionOption) => {
    if (hasSubmitted || isPaused) return;
    const isSelected = selected.some((s) => s.title === option.title);
    if (isSelected) {
      setSelected(selected.filter((s) => s.title !== option.title));
    } else if (pointsRemaining >= option.cost) {
      setSelected([...selected, option]);
    }
  };

  if (hasSubmitted) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 sticky top-6 text-center">
        <h3 className="text-xl font-bold mb-4">{allAIsDone ? 'Generating next scenario...' : 'Waiting for Opponents...'}</h3>
        {!allAIsDone && (
          <div className="space-y-3 text-left">
            {aiPlayers.map((player) => {
              const isComplete = aiCompletionStatus[player.role.name];
              return (
                <div
                  key={player.id}
                  className={`flex items-center p-3 rounded-lg transition-all duration-300 ${
                    isComplete ? 'bg-green-800/50 border border-green-700' : 'bg-gray-700/50'
                  }`}
                >
                  {isComplete ? <CheckCircleIcon className="h-6 w-6 text-green-400 mr-3" /> : <LoadingSpinner />}
                  <span className={isComplete ? 'text-gray-300' : 'text-gray-400'}>{player.role.name}</span>
                </div>
              );
            })}
          </div>
        )}
        {allAIsDone && <LoadingSpinner />}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 sticky top-6">
      {isPaused && (
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
          <PauseIcon className="h-12 w-12 text-blue-400 mb-4" />
          <h3 className="text-xl font-bold">Game Paused</h3>
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">Your Actions</h3>
          <p className="text-sm text-gray-400">Spend up to {GAME_CONFIG.ACTION_POINTS_PER_ROUND} points each round.</p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase tracking-wide text-gray-400">Points Remaining</span>
          <div
            className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
              pointsRemaining > 1
                ? 'bg-green-900/40 text-green-300'
                : pointsRemaining === 0
                ? 'bg-red-900/40 text-red-300'
                : 'bg-yellow-900/40 text-yellow-300'
            }`}
          >
            {pointsRemaining}
          </div>
        </div>
      </div>
      {isLoading && !options.length ? (
        <div className="flex justify-center items-center h-48">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {options.map((opt) => {
            const isSelected = selected.some((s) => s.title === opt.title);
            const preview = opt.description.length > 110 ? `${opt.description.slice(0, 110).trim()}…` : opt.description;
            const canSelect = pointsRemaining >= opt.cost || isSelected;
            return (
              <button
                key={opt.title}
                type="button"
                onClick={() => toggleAction(opt)}
                disabled={!canSelect && !isSelected}
                className={`w-full text-left p-3 rounded-md border transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-900/40 shadow-inner'
                    : canSelect
                    ? 'border-gray-700 bg-gray-900/50 hover:border-blue-400'
                    : 'border-gray-800 bg-gray-900/20 text-gray-500 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-200'}`}>{opt.title}</p>
                    <p className={`mt-2 text-sm leading-snug ${isSelected ? 'text-gray-200' : 'text-gray-400'}`}>
                      {isSelected ? opt.description : preview}
                    </p>
                  </div>
                  <span className="inline-flex items-center text-xs font-semibold bg-gray-800 text-blue-300 px-2 py-0.5 rounded-full shrink-0">
                    {opt.cost} AP
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <button
          onClick={() => onConfirm(selected)}
          disabled={confirmDisabled}
          className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center ${
            confirmDisabled ? 'bg-gray-600 hover:bg-gray-600 cursor-not-allowed' : ''
          }`}
        >
          Confirm Actions
        </button>
      </div>
    </div>
  );
};

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
                onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
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
