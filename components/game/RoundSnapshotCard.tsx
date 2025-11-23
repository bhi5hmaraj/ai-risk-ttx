import React, { useMemo, useState, useEffect } from 'react';
import type { GameState, GameLogEntry, ActionOption, Player } from '../../types';
import { CauseTag } from './CauseTag';
import { GAME_CONFIG } from '../../constants';
import { LoadingSpinner, CheckCircleIcon } from '../Icons';
import { useRotatingJoke } from '@/lib/loadingJokes';

interface RoundSnapshotCardProps {
  gameState: GameState;
  latestLogEntry: GameLogEntry | null;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  onViewActionTree: () => void;
  canViewActionTree: boolean;
  players: any[];
  actionOptions: ActionOption[];
  onConfirmActions: (actions: ActionOption[]) => void;
  isLoading: boolean;
  hasSubmitted: boolean;
  isPaused: boolean;
  aiCompletionStatus: Record<string, boolean>;
  availablePoints: number;
  humanPlayer: Player;
}

export const RoundSnapshotCard: React.FC<RoundSnapshotCardProps> = ({
  gameState,
  latestLogEntry,
  onToggleHistory,
  isHistoryOpen,
  onViewActionTree,
  canViewActionTree,
  players,
  actionOptions,
  onConfirmActions,
  isLoading,
  hasSubmitted,
  isPaused,
  aiCompletionStatus,
  availablePoints,
  humanPlayer,
}) => {
  const metric = gameState.coreMetric;
  const lastDelta = latestLogEntry?.publicScoreChange ?? null;
  const lastRoundNumber = latestLogEntry?.round ?? (gameState.round > 1 ? gameState.round - 1 : 0);
  const hasLastRound = Boolean(latestLogEntry);
  const playerActions = latestLogEntry?.playerActions ?? [];
  const hiddenScoreChanges = latestLogEntry?.hiddenScoreChanges ?? {};
  const lastPublicScore = hasLastRound ? latestLogEntry?.publicScoreAfter ?? metric.value : metric.value;

  // Action selection state and logic
  const [selected, setSelected] = useState<ActionOption[]>([]);
  const pointsUsed = useMemo(() => selected.reduce((acc, curr) => acc + curr.cost, 0), [selected]);
  const pointsRemaining = availablePoints - pointsUsed;
  const aiPlayers = useMemo(() => players.filter((p) => !p.isHuman), [players]);
  const allAIsDone = useMemo(() => aiPlayers.every((p) => aiCompletionStatus[p.role.name]), [aiPlayers, aiCompletionStatus]);
  const confirmDisabled = isLoading || isPaused;
  const joke = useRotatingJoke(4000);

  // Reset selected actions when round changes or when submitted
  useEffect(() => {
    setSelected([]);
  }, [gameState.round, hasSubmitted]);

  const toggleAction = (option: ActionOption) => {
    if (hasSubmitted || isPaused) return;
    const isSelected = selected.some((s) => s.title === option.title);
    if (isSelected) {
      setSelected(selected.filter((s) => s.title !== option.title));
    } else if (pointsRemaining >= option.cost) {
      setSelected([...selected, option]);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      {/* Compact Header */}
      <div className="bg-blue-900/30 border border-blue-700/40 rounded-md p-2 mb-2">
        <div className="flex flex-col gap-2">
          {/* Event details - side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-blue-200 mb-1">Current Event:</p>
              <p className="text-xs text-blue-100/90 leading-relaxed">{gameState.currentEvent?.detail ?? gameState.currentEvent?.headline ?? 'Awaiting next event'}</p>
            </div>
            {hasLastRound && latestLogEntry?.event && (
              <div>
                <p className="text-xs font-semibold text-blue-200 mb-1">Last Round:</p>
                <p className="text-xs text-blue-100/90 leading-relaxed">{latestLogEntry.event.detail ?? latestLogEntry.event.headline}</p>
              </div>
            )}
          </div>
          {/* Action buttons - below on mobile, right on desktop */}
          <div className="flex flex-wrap gap-2 sm:self-end">
            <button
              onClick={onToggleHistory}
              className="px-2 py-1 rounded text-[11px] font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              {isHistoryOpen ? 'Hide History' : 'View History'}
            </button>
            <button
              onClick={onViewActionTree}
              disabled={!canViewActionTree}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                canViewActionTree ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Action Tree
            </button>
          </div>
        </div>
      </div>

      {/* 3 Sections Stacked as Rows */}
      <div className="flex flex-col gap-3">
        {/* SECTION 1: Key Moments */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-blue-200 mb-3 font-semibold">Key Moments</p>
          {hasLastRound && latestLogEntry?.outcomeTimeline?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {latestLogEntry.outcomeTimeline.map((item, index) => (
                <div key={`km_${index}`} className="bg-gray-950/60 border border-blue-800/30 rounded p-2">
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 flex-shrink-0 rounded-full bg-blue-800 text-blue-200 font-bold text-[10px] flex items-center justify-center">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white mb-0.5">{item.title}</p>
                      <p className="text-[11px] text-gray-300 leading-snug">{item.description}</p>
                      <p className="text-[10px] text-blue-300 mt-1">
                        <span className="text-blue-100">{item.impact}</span>
                      </p>
                      {item.causes && item.causes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 items-center">
                          <p className="text-[11px] uppercase tracking-wide text-gray-400 mr-1">Because:</p>
                          {item.causes.map((c, i) => (
                            <CauseTag key={`km_${index}_c_${i}`} cause={c as any} logs={gameState.eventLog} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-blue-950/60 border border-blue-700/30 rounded-md p-3">
              <p className="text-xs text-blue-100/80 leading-relaxed">The AI Game Master will summarize key moments here once actions are submitted.</p>
            </div>
          )}
        </div>

        {/* SECTION 2: Actions & Score Changes */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-md p-3">
          <p className="text-xs uppercase tracking-wide text-blue-200 mb-3 font-semibold">Actions &amp; Score Changes</p>
          {hasLastRound && playerActions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {playerActions.map((playerAction) => {
                const hiddenUpdate = hiddenScoreChanges[playerAction.roleName];
                const matchingPlayer = players.find((p) => p.role.name === playerAction.roleName);
                return (
                  <div key={`action_${playerAction.roleName}`} className="bg-gray-950/60 border border-amber-800/30 rounded p-2">
                    <div className="mb-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-semibold text-white text-xs">{playerAction.roleName}</span>
                        {hiddenUpdate && (
                          <span className={`text-xs font-bold flex-shrink-0 ${hiddenUpdate.update >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {hiddenUpdate.update >= 0 ? '+' : ''}{hiddenUpdate.update}
                          </span>
                        )}
                      </div>
                      {matchingPlayer && (
                        <span className="text-[10px] text-amber-400 italic block truncate">
                          {matchingPlayer.role.hiddenObjective}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-0.5">
                      {playerAction.actions.length > 0 ? (
                        playerAction.actions.map((action, idx) => (
                          <li key={idx} className="flex justify-between items-start gap-2 text-[11px]">
                            <span className="leading-snug flex-1 text-gray-300 line-clamp-1">{action.title}</span>
                            <span className="flex-shrink-0 text-[10px] font-semibold text-blue-300">{action.cost}AP</span>
                          </li>
                        ))
                      ) : (
                        <li className="italic text-gray-500 text-[11px]">No action</li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-blue-950/60 border border-blue-700/30 rounded-md p-3">
              <p className="text-xs text-blue-100/80 leading-relaxed">Actions and score changes will appear here after the first round.</p>
            </div>
          )}
        </div>

        {/* SECTION 3: Your Actions */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-md p-3 relative">
          {isPaused && (
            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
              <div className="h-12 w-12 text-blue-400 mb-4">⏸️</div>
              <h3 className="text-xl font-bold">Game Paused</h3>
            </div>
          )}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-blue-200 font-semibold">Your Actions</p>
              <p className="text-xs text-gray-400 mt-1">
                {availablePoints} AP (max {GAME_CONFIG.MAX_ACTION_POINTS})
              </p>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wide text-gray-400">Remaining</span>
              <div className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                pointsRemaining > 1
                  ? 'bg-green-900/40 text-green-300'
                  : pointsRemaining === 0
                  ? 'bg-red-900/40 text-red-300'
                  : 'bg-yellow-900/40 text-yellow-300'
              }`}>
                {pointsRemaining}
              </div>
            </div>
          </div>

          {hasSubmitted ? (
            <div className="text-center">
              {humanPlayer && Array.isArray(humanPlayer.actions) && humanPlayer.actions.length > 0 && (
                <div className="mb-2 text-left">
                  <h4 className="text-xs font-semibold mb-1.5 text-blue-200">Submitted Actions</h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {humanPlayer.actions.map((a) => (
                      <div key={a.title} className="bg-gray-700/40 border border-gray-700 rounded p-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-200 font-medium text-xs">{a.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 text-blue-300">{a.cost} AP</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <h3 className="text-sm font-bold mb-2">{allAIsDone ? 'Generating next scenario...' : 'Waiting for Opponents...'}</h3>
              {!allAIsDone && (
                <div className="space-y-1.5 text-left mb-2">
                  {aiPlayers.map((player) => {
                    const isComplete = aiCompletionStatus[player.role.name];
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center p-1.5 rounded-lg transition-all duration-300 ${
                          isComplete ? 'bg-green-800/50 border border-green-700' : 'bg-gray-700/50'
                        }`}
                      >
                        {isComplete ? <CheckCircleIcon className="h-4 w-4 text-green-400 mr-2" /> : <LoadingSpinner />}
                        <span className={`text-xs ${isComplete ? 'text-gray-300' : 'text-gray-400'}`}>{player.role.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {allAIsDone && (
                <div className="flex flex-col items-center mb-2">
                  <LoadingSpinner />
                </div>
              )}
              <p className="text-[10px] text-gray-400 italic text-center">
                "{joke}"
              </p>
            </div>
          ) : (
            <>
              {isLoading && !actionOptions.length ? (
                <div className="flex flex-col justify-center items-center h-24">
                  <LoadingSpinner />
                  <p className="mt-2 text-[10px] text-gray-400 italic text-center">
                    "{joke}"
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-3">
                  {actionOptions.map((opt) => {
                    const isSelected = selected.some((s) => s.title === opt.title);
                    const canSelect = pointsRemaining >= opt.cost || isSelected;
                    return (
                      <button
                        key={opt.title}
                        type="button"
                        onClick={() => toggleAction(opt)}
                        disabled={!canSelect && !isSelected}
                        className={`w-full text-left p-2 rounded-md border transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-900/40 shadow-inner'
                            : canSelect
                            ? 'border-gray-700 bg-gray-900/50 hover:border-blue-400'
                            : 'border-gray-800 bg-gray-900/20 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-xs ${isSelected ? 'text-white' : 'text-gray-200'}`}>{opt.title}</p>
                            <p className="mt-1 text-[11px] leading-snug text-gray-200">{opt.description}</p>
                          </div>
                          <span className="inline-flex items-center text-[10px] font-semibold bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded-full shrink-0">
                            {opt.cost} AP
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => onConfirmActions(selected)}
                disabled={confirmDisabled}
                className={`w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center text-sm ${
                  confirmDisabled ? 'bg-gray-600 hover:bg-gray-600 cursor-not-allowed' : ''
                }`}
              >
                Confirm Actions
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
