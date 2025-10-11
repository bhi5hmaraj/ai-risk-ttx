import React, { useMemo } from 'react';
import type { GameState, Player } from '../../types';
import { BeakerIcon } from '../Icons';

interface EventLogProps {
  gameState: GameState;
  players: Player[];
  onViewActionTree: () => void;
  canViewActionTree: boolean;
  expandedRound: number | null;
  setExpandedRound: (round: number | null) => void;
}

export const EventLog: React.FC<EventLogProps> = ({
  gameState,
  players,
  onViewActionTree,
  canViewActionTree,
  expandedRound,
  setExpandedRound,
}) => {
  const metricName = gameState.coreMetric.name;
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

                {log.roundSummary && (
                  <div className="bg-gray-900/60 border border-gray-800 rounded-md p-3">
                    <p className="text-xs uppercase tracking-wide text-blue-200 mb-1">Round Summary</p>
                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{log.roundSummary}</p>
                  </div>
                )}

                {log.outcomeTimeline?.length ? (
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wide text-blue-200">Key Moments</p>
                    <ol className="space-y-3">
                      {log.outcomeTimeline.map((item, index) => (
                        <li key={`${log.round}_${index}`} className="flex gap-3">
                          <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-blue-800 text-blue-200 font-semibold text-sm flex items-center justify-center">
                            {index + 1}
                          </div>
                          <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded-md p-3 space-y-1">
                            <p className="text-sm font-semibold text-white">{item.title}</p>
                            <p className="text-sm text-gray-200 leading-relaxed">{item.description}</p>
                            <p className="text-xs uppercase tracking-wide text-blue-300">Impact: <span className="normal-case font-medium text-blue-100">{item.impact}</span></p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {log.counterfactualNote && (
                  <div className="bg-gray-900/40 border border-blue-800/30 rounded-md p-3 text-sm text-blue-100/90">
                    <span className="font-semibold uppercase tracking-wide text-blue-200">If No One Acted</span>
                    <p className="mt-1 leading-relaxed">{log.counterfactualNote}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
