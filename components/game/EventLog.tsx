import React, { useMemo } from 'react';
import type { GameState, Player } from '../../types';
import { CauseTag } from './CauseTag';

interface EventLogProps {
  gameState: GameState;
  players: Player[];
  onViewActionTree: () => void;
  canViewActionTree: boolean;
  expandedRound: number | null;
  setExpandedRound: (round: number | null) => void;
  /** Order of rounds: 'desc' (latest-first, default) or 'asc' (oldest-first). */
  order?: 'asc' | 'desc';
  /** Disable internal scrolling (for end screen where we want full page scroll) */
  noScroll?: boolean;
}

export const EventLog: React.FC<EventLogProps> = ({
  gameState,
  players,
  onViewActionTree,
  canViewActionTree,
  expandedRound,
  setExpandedRound,
  order = 'desc',
  noScroll = false,
}) => {
  const metricName = gameState.coreMetric.name;
  const orderedLog = useMemo(() => {
    const copy = gameState.eventLog.slice();
    return order === 'asc' ? copy : copy.reverse();
  }, [gameState.eventLog, order]);

  return (
    <div className={`${noScroll ? '' : 'bg-gray-800 rounded-lg p-6 max-h-[50vh] overflow-y-auto'}`}>
      <div className="flex items-center justify-between mb-4">
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

      <div className="space-y-4">
      {orderedLog.map((log, index) => {
        const scoreDelta = log.publicScoreChange;
        const deltaLabel = log.round > 0 ? `${scoreDelta >= 0 ? '+' : ''}${scoreDelta}` : null;
        const isLastRound = index === orderedLog.length - 1;

        return (
          <React.Fragment key={log.round}>
            <div className="space-y-3">
              {/* Round Header */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm">
                    {log.round > 0 ? `ROUND ${log.round}` : 'OPENING SCENARIO'}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {metricName}: <span className="text-white font-semibold">{log.publicScoreAfter}%</span>
                    {deltaLabel && (
                      <span className={`ml-2 font-semibold ${scoreDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>({deltaLabel})</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Event Details */}
              <div className="space-y-3">
                {log.event && (
                  <div className="bg-gray-900/60 p-2.5 rounded border border-gray-800">
                    <p className="font-bold text-red-400 text-sm">{log.event.headline}</p>
                    <p className="text-gray-300 text-xs mt-1 whitespace-pre-wrap leading-relaxed">{log.event.detail}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Column 1: Key Moments */}
                  <div className="space-y-2">
                    {log.outcomeTimeline?.length ? (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-blue-200 mb-1.5">Key Moments</p>
                        <ol className="space-y-2">
                          {log.outcomeTimeline.map((item, index) => (
                            <li key={`${log.round}_${index}`} className="flex gap-2">
                              <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-blue-800 text-blue-200 font-semibold text-xs flex items-center justify-center">
                                {index + 1}
                              </div>
                              <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded p-2 space-y-1">
                                <p className="text-xs font-semibold text-white">{item.title}</p>
                                <p className="text-xs text-gray-200 leading-relaxed">{item.description}</p>
                                <p className="text-[10px] uppercase tracking-wide text-blue-300">Impact: <span className="normal-case font-medium text-blue-100">{item.impact}</span></p>
                                {item.causes && item.causes.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mr-1">Because:</p>
                                    {item.causes.map((c, i) => (
                                      <CauseTag key={`${log.round}_${index}_c_${i}`} cause={c as any} logs={gameState.eventLog} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </div>

                  {/* Column 2: Actions & Outcomes */}
                  <div>
                    {log.playerActions && log.playerActions.length > 0 && (
                      <>
                        <h4 className="font-bold text-xs text-gray-300 uppercase tracking-wider mb-1.5">Actions</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {log.playerActions.map((playerAction) => {
                        const matchingPlayer = players.find((p) => p.role.name === playerAction.roleName);
                        const roleIcon = matchingPlayer?.role.icon ?? ((props: React.SVGProps<SVGSVGElement>) => (
                          <span className="text-2xl" role="img" aria-label="role icon">❓</span>
                        ));
                        const scoreChange = log.hiddenScoreChanges[playerAction.roleName];
                        return (
                          <div key={`${playerAction.roleName}_${log.round}`} className="bg-gray-900/70 p-2 rounded border border-gray-800">
                            <div className="flex items-center mb-1.5 min-w-0">
                              {roleIcon({ className: 'h-4 w-4 mr-2 text-blue-400' })}
                              <span className="font-bold text-white text-xs mr-2 truncate" title={playerAction.roleName}>{playerAction.roleName}</span>
                              {matchingPlayer && (
                                <span className="text-[10px] text-gray-400 truncate" title={matchingPlayer.role.hiddenObjective}>
                                  {matchingPlayer.role.hiddenObjective}
                                </span>
                              )}
                            </div>
                            <ul className="space-y-1 text-xs text-gray-400">
                              {playerAction.actions.length > 0 ? (
                                playerAction.actions.map((action, index) => (
                                  <li key={index} className="flex justify-between items-start">
                                    <span className="mr-1 leading-tight">{action.title}</span>
                                    <span className="flex-shrink-0 inline-flex items-center text-[10px] font-semibold bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded-full">
                                      {action.cost}AP
                                    </span>
                                  </li>
                                ))
                              ) : (
                                <li className="italic text-gray-500 text-xs">No action</li>
                              )}
                            </ul>
                            {scoreChange && (
                              <div className="mt-2 pt-2 border-t border-gray-800 text-xs">
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
                                <p className="text-[10px] text-amber-300/80 italic mt-1 leading-tight">
                                  <span className="font-bold">Why:</span> {scoreChange.justification}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Column 3: Score & Notes */}
                  <div className="space-y-2">
                    {log.round > 0 && (
                      <div className="bg-gray-900/60 border border-gray-800 rounded p-2 text-xs">
                        <p className="text-[10px] uppercase tracking-wide text-blue-200 mb-1">Score</p>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">{metricName}</span>
                          <span className="text-white font-semibold">{log.publicScoreAfter}% {deltaLabel && (
                            <span className={`ml-2 font-bold ${scoreDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>({deltaLabel})</span>
                          )}</span>
                        </div>
                        {log.geminiCalls > 0 && (
                          <div className="mt-2 flex items-center justify-between text-gray-300">
                            <span>AI Calls</span>
                            <span className="text-white font-semibold">{log.geminiCalls}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {false && log.roundSummary && (
                      <div className="bg-gray-900/60 border border-gray-800 rounded p-2">
                        <p className="text-[10px] uppercase tracking-wide text-blue-200 mb-1">Summary</p>
                        <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">{log.roundSummary}</p>
                      </div>
                    )}

                    {log.counterfactualNote && (
                      <div className="bg-gray-900/40 border border-blue-800/30 rounded p-2 text-xs text-blue-100/90">
                        <span className="font-semibold uppercase tracking-wide text-[10px] text-blue-200">If No One Acted</span>
                        <p className="mt-1 leading-relaxed">{log.counterfactualNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Divider between rounds */}
            {!isLastRound && (
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-gray-800 px-2 text-xs text-gray-500">•</span>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
      </div>
    </div>
  );
};
