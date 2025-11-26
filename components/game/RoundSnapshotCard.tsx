import React, { useMemo, useState, useEffect } from 'react';
import type { GameState, GameLogEntry, ActionOption, Player } from '../../types';
import { CauseTag } from './CauseTag';
import { LoadingSpinner, CheckCircleIcon } from '../Icons';
import { useRotatingJoke } from '@/lib/loadingJokes';
import { useUIStore } from '../../stores/uiStore';

interface RoundSnapshotCardProps {
  gameState: GameState;
  latestLogEntry: GameLogEntry | null;
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
  const { fontSize } = useUIStore();
  const metric = gameState.coreMetric;
  const lastDelta = latestLogEntry?.publicScoreChange ?? null;
  const lastRoundNumber = latestLogEntry?.round ?? (gameState.round > 1 ? gameState.round - 1 : 0);
  const hasLastRound = Boolean(latestLogEntry);
  const playerActions = latestLogEntry?.playerActions ?? [];
  const hiddenScoreChanges = latestLogEntry?.hiddenScoreChanges ?? {};
  const lastPublicScore = hasLastRound ? latestLogEntry?.publicScoreAfter ?? metric.value : metric.value;

  // Font size mappings
  const fontSizes = {
    title: fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm',
    body: fontSize === 'small' ? 'text-[11px]' : fontSize === 'large' ? 'text-sm' : 'text-xs',
    caption: fontSize === 'small' ? 'text-[10px]' : fontSize === 'large' ? 'text-xs' : 'text-[11px]',
  };

  // Action selection state and logic
  const [selected, setSelected] = useState<ActionOption[]>([]);
  const pointsUsed = useMemo(() => selected.reduce((acc, curr) => acc + curr.cost, 0), [selected]);
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
    } else if (pointsUsed + option.cost <= availablePoints) {
      setSelected([...selected, option]);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-2">
      {/* Compact Header */}
      <div className="bg-blue-900/30 border border-blue-700/40 rounded-md p-2 mb-2">
        {/* Event details - side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className={`${fontSizes.body} font-semibold text-blue-200 mb-1.5`}>Current Event:</p>
            <p className={`${fontSizes.body} text-blue-100/90 leading-relaxed`}>{gameState.currentEvent?.detail ?? gameState.currentEvent?.headline ?? 'Awaiting next event'}</p>
          </div>
          {hasLastRound && latestLogEntry?.event && (
            <div>
              <p className={`${fontSizes.body} font-semibold text-blue-200 mb-1.5`}>Last Round:</p>
              <p className={`${fontSizes.body} text-blue-100/90 leading-relaxed`}>{latestLogEntry.event.detail ?? latestLogEntry.event.headline}</p>
            </div>
          )}
        </div>
      </div>

      {/* 3 Sections Stacked as Rows */}
      <div className="flex flex-col gap-2">
        {/* SECTION 1: Key Moments */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-md p-2 flex gap-2">
          <div className="flex-shrink-0 flex items-center justify-center">
            <p className="text-xs uppercase tracking-wide text-blue-200 font-semibold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Key Moments</p>
          </div>
          <div className="flex-1 min-w-0">
            {hasLastRound && latestLogEntry?.outcomeTimeline?.length ? (
              <>
                {/* Key Moments Grid */}
                <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                  {latestLogEntry.outcomeTimeline.map((item, index) => (
                    <div key={`km_${index}`} className="bg-gray-950/60 border border-blue-800/30 rounded p-3">
                      <div className="flex items-start gap-2">
                        <div className="h-6 w-6 flex-shrink-0 rounded-full bg-blue-800 text-blue-200 font-bold text-sm flex items-center justify-center">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`${fontSizes.title} font-semibold text-white mb-1.5 break-words`}>{item.title}</p>
                          <p className={`${fontSizes.body} text-gray-300 leading-relaxed break-words`}>{item.description}</p>
                          <p className={`${fontSizes.body} text-blue-300 mt-1.5 break-words`}>
                            <span className="text-blue-100">{item.impact}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Causal Pills Grid - matching key moments columns */}
                {(() => {
                  const hasCauses = latestLogEntry.outcomeTimeline.some(item => item.causes && item.causes.length > 0);
                  return hasCauses && (
                    <div className="border-t border-blue-800/30 bg-gray-950/60 rounded px-2 py-2">
                      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                        {latestLogEntry.outcomeTimeline.map((item, itemIdx) => {
                          const causes = (item.causes || []).map((c, causeIdx) => ({ cause: c, key: `km_${itemIdx}_c_${causeIdx}` }));
                          return (
                            <div key={`cause_col_${itemIdx}`} className="flex flex-wrap gap-1.5 content-start justify-center">
                              {causes.length > 0 ? (
                                causes.map(({ cause, key }) => (
                                  <CauseTag key={key} cause={cause as any} logs={gameState.eventLog} />
                                ))
                              ) : (
                                <div className="h-6" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="bg-blue-950/60 border border-blue-700/30 rounded-md p-4">
                <p className={`${fontSizes.body} text-blue-100/80 leading-relaxed`}>The AI Game Master will summarize key moments here once actions are submitted.</p>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Your Actions (moved above Score Δ) */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-md p-2 relative flex gap-2">
          <div className="flex-shrink-0 flex items-center justify-center">
            <p className="text-xs uppercase tracking-wide text-blue-200 font-semibold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Your Actions</p>
          </div>
          <div className="flex-1 min-w-0 relative">
            {isPaused && (
              <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
                <div className="h-12 w-12 text-blue-400 mb-4">⏸️</div>
                <h3 className="text-xl font-bold">Game Paused</h3>
              </div>
            )}
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
                <div className="flex flex-wrap gap-2 justify-center mb-2">
                  {aiPlayers.map((player) => {
                    const isComplete = aiCompletionStatus[player.role.name];
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center px-2 py-1 rounded-lg transition-all duration-300 ${
                          isComplete ? 'bg-green-800/50 border border-green-700' : 'bg-gray-700/50'
                        }`}
                      >
                        {isComplete ? <CheckCircleIcon className="h-4 w-4 text-green-400 mr-1.5" /> : <LoadingSpinner />}
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
                <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                  {actionOptions.map((opt) => {
                    const isSelected = selected.some((s) => s.title === opt.title);
                    const canSelect = (pointsUsed + opt.cost <= availablePoints) || isSelected;
                    return (
                      <button
                        key={opt.title}
                        type="button"
                        onClick={() => toggleAction(opt)}
                        disabled={!canSelect && !isSelected}
                        className={`w-full text-left p-1.5 rounded-md border transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-900/40 shadow-inner'
                            : canSelect
                            ? 'border-gray-700 bg-gray-900/50 hover:border-blue-400'
                            : 'border-gray-800 bg-gray-900/20 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <p className={`font-semibold ${fontSizes.body} break-words flex-1 ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                            {opt.title}
                            <span className={`ml-1.5 inline-flex items-center ${fontSizes.caption} font-semibold bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded-full`}>
                              {opt.cost} AP
                            </span>
                          </p>
                        </div>
                        <p className={`mt-1 ${fontSizes.body} leading-relaxed text-gray-200 break-words`}>{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  disabled={selected.length === 0 || confirmDisabled}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                    selected.length === 0 || confirmDisabled
                      ? 'border-gray-700 text-gray-500 cursor-not-allowed'
                      : 'border-gray-600 text-gray-200 hover:border-blue-400'
                  }`}
                  title="Clear selected actions"
                >
                  Reset
                </button>

                <button
                  onClick={() => onConfirmActions(selected)}
                  disabled={confirmDisabled}
                  className={`flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center text-sm ${
                    confirmDisabled ? 'bg-gray-600 hover:bg-gray-600 cursor-not-allowed' : ''
                  }`}
                >
                  Confirm Actions
                </button>
              </div>
            </>
          )}
          </div>
        </div>

        {/* SECTION 3: Score Δ (moved below actions) */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-md p-2 flex gap-2">
          <div className="flex-shrink-0 flex items-center justify-center">
            <p className="text-xs uppercase tracking-wide text-blue-200 font-semibold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Score Δ</p>
          </div>
          <div className="flex-1 min-w-0">
            {hasLastRound && playerActions.length > 0 ? (
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {playerActions.map((playerAction) => {
                  const hiddenUpdate = hiddenScoreChanges[playerAction.roleName];
                  const matchingPlayer = players.find((p) => p.role.name === playerAction.roleName);
                  return (
                    <div key={`action_${playerAction.roleName}`} className="bg-gray-950/60 border border-amber-800/30 rounded p-2">
                      <div className="mb-1">
                        <div className="flex items-start justify-between gap-1 mb-0.5">
                          <span className="font-semibold text-white text-xs break-words">{playerAction.roleName}</span>
                          {hiddenUpdate && (
                            <span className={`text-xs font-bold flex-shrink-0 ${hiddenUpdate.update >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {hiddenUpdate.update >= 0 ? '+' : ''}{hiddenUpdate.update}
                            </span>
                          )}
                        </div>
                        {matchingPlayer && (
                          <span className="text-[10px] text-amber-400 italic block break-words">
                            {matchingPlayer.role.hiddenObjective}
                          </span>
                        )}
                      </div>
                      <ul className="space-y-0.5 mt-1">
                        {playerAction.actions.length > 0 ? (
                          playerAction.actions.map((action, idx) => (
                            <li key={idx} className="flex justify-between items-start gap-1 text-[11px]">
                              <span className="leading-tight flex-1 text-gray-300 break-words">{action.title}</span>
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
                <p className="text-xs text-blue-100/80 leading-relaxed">Actions and score Δ will appear here after the first round.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
