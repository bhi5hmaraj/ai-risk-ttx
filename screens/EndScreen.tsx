import React, { useState, useEffect } from 'react';
import { ChatBubbleLeftIcon, LoadingSpinner } from '../components/Icons';
import type { GameState, Player } from '../types';
import { CauseTag } from '../components/game/CauseTag';
import type { AIDebriefResponse } from '../server/types/core';
import { useRotatingJoke } from '@/lib/loadingJokes';

interface EndScreenProps {
  gameState: GameState;
  players: Player[];
  onReset: () => void;
  onOpenFeedback?: () => void;
  gameSetup?: any;
}

export const EndScreen: React.FC<EndScreenProps> = ({ gameState, players, onReset, onOpenFeedback, gameSetup }) => {
  const finalLogEntry = gameState.eventLog[gameState.eventLog.length - 1] ?? null;
  const finalScoreChange = finalLogEntry?.publicScoreChange ?? null;
  const [debrief, setDebrief] = useState<AIDebriefResponse | null>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [debriefError, setDebriefError] = useState<string | null>(null);
  const joke = useRotatingJoke(4000);

  const impactClass = (impact: string) => {
    const v = (impact || '').toLowerCase();
    if (/(pos|green|improve|increase|gain|good)/.test(v)) return 'text-green-300';
    if (/(neg|red|worse|decrease|loss|bad)/.test(v)) return 'text-red-300';
    if (/(mix|neutral|balanced)/.test(v)) return 'text-amber-200';
    return 'text-blue-300';
  };

  const handleGenerateDebrief = async () => {
    try {
      setDebriefError(null);
      setDebriefLoading(true);
      const resp = await fetch('/api/llm/generate/debrief', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameSetup, players, gameState }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!json?.success) throw new Error(json?.error || 'Failed to generate debrief');
      setDebrief(json.data as AIDebriefResponse);
    } catch (e: any) {
      setDebriefError(e?.message || String(e));
    } finally {
      setDebriefLoading(false);
    }
  };

  // Auto-generate debrief on mount
  useEffect(() => {
    handleGenerateDebrief();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 pt-20 flex flex-col items-center">
      <div className="w-full max-w-[1920px] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-400">Simulation Over</h1>
          <p className="text-base md:text-lg text-gray-300">
            Final {gameState.coreMetric.name}:{' '}
            <span className="text-2xl font-bold text-green-400">
              {gameState.coreMetric.value}%
            </span>
            {finalScoreChange !== null && (
              <span className={`ml-2 text-lg font-semibold ${finalScoreChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ({finalScoreChange >= 0 ? '+' : ''}{finalScoreChange})
              </span>
            )}
          </p>
        </div>

        {/* Two-column layout: Personal Objective + AI Debrief Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          {/* Your Personal Objective */}
          {(() => {
            const humanPlayer = players.find(p => p.isHuman);
            return humanPlayer && (
              <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-4 md:p-6 h-fit">
                <div className="flex items-center gap-3 mb-2">
                  {typeof humanPlayer.role.icon === 'function'
                    ? humanPlayer.role.icon({ className: 'h-6 w-6 text-amber-400' })
                    : <span className="text-2xl">{humanPlayer.role.icon}</span>
                  }
                  <h3 className="text-lg md:text-xl font-bold text-amber-300">Your Role: {humanPlayer.role.name}</h3>
                </div>
                <p className="text-sm md:text-base text-amber-100/90">
                  <span className="font-semibold">Secret Objective:</span> {humanPlayer.role.hiddenObjective}
                </p>
                <p className="text-sm md:text-base text-amber-100/90 mt-2">
                  <span className="font-semibold">Personal Score:</span>{' '}
                  <span className="text-xl font-mono text-amber-300">
                    {humanPlayer.hiddenScore > 0 ? '+' : ''}{humanPlayer.hiddenScore}
                  </span>
                </p>
              </div>
            );
          })()}

          {/* AI Debrief Summary */}
          <div className="bg-gray-800 rounded-lg p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-3">AI Debrief</h2>
            {debriefLoading && (
              <div className="flex flex-col items-center justify-center py-8">
                <LoadingSpinner />
                <p className="mt-4 text-sm text-gray-400 italic text-center">
                  "{joke}"
                </p>
              </div>
            )}
            {debriefError && (
              <div className="text-red-300 text-sm">{debriefError}</div>
            )}
            {debrief && !debriefLoading && (
              <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">{debrief.summary}</p>
            )}
          </div>
        </div>

        {/* AI Debrief Tables - Full Width */}
        {debrief && !debriefLoading && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 md:p-8 space-y-6">

            {/* Round Impact Table */}
            <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-blue-200">Round Impact (Score Changes)</p>
                <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full text-sm text-left border border-gray-700 rounded-md overflow-hidden">
                      <thead className="bg-gray-900/70 text-gray-300">
                        <tr>
                          <th className="px-2 md:px-3 py-2 border-b border-gray-700 whitespace-nowrap">Round</th>
                          <th className="px-2 md:px-3 py-2 border-b border-gray-700 min-w-[150px]">Headline</th>
                          <th className="px-2 md:px-3 py-2 border-b border-gray-700 whitespace-nowrap">Δ Score</th>
                          <th className="px-2 md:px-3 py-2 border-b border-gray-700 whitespace-nowrap">Δ %</th>
                          <th className="px-2 md:px-3 py-2 border-b border-gray-700 whitespace-nowrap">After</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gameState.eventLog
                          .filter((e) => (e.round ?? 0) >= 0)
                          .map((e) => {
                            const delta = e.publicScoreChange || 0;
                            const prev = (e.publicScoreAfter ?? 0) - delta;
                            const rel = prev !== 0 ? (delta / prev) * 100 : 0;
                            const color = delta >= 0 ? 'text-green-300' : 'text-red-300';
                            return (
                              <tr key={`r_${e.round}`} className="odd:bg-gray-900/40">
                                <td className="px-2 md:px-3 py-2 border-b border-gray-800 text-gray-200">{e.round}</td>
                                <td className="px-2 md:px-3 py-2 border-b border-gray-800 text-gray-200">{e.event?.headline || '—'}</td>
                                <td className={`px-2 md:px-3 py-2 border-b border-gray-800 font-semibold ${color}`}>{delta > 0 ? `+${delta}` : delta}</td>
                                <td className={`px-2 md:px-3 py-2 border-b border-gray-800 ${color}`}>{(rel >= 0 ? '+' : '') + rel.toFixed(1)}%</td>
                                <td className="px-2 md:px-3 py-2 border-b border-gray-800 text-gray-200">{e.publicScoreAfter}%</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>

            {/* Key Events Table */}
            {debrief.keyEvents?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-blue-200">Key Decisive Events</p>
                  <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full text-sm text-left border border-gray-700 rounded-md overflow-hidden">
                        <thead className="bg-gray-900/70 text-gray-300">
                          <tr>
                            <th className="px-2 md:px-3 py-2 border-b border-gray-700 whitespace-nowrap">Round</th>
                            <th className="px-2 md:px-3 py-2 border-b border-gray-700 min-w-[100px]">Actor</th>
                            <th className="px-2 md:px-3 py-2 border-b border-gray-700 min-w-[120px]">Title</th>
                            <th className="px-2 md:px-3 py-2 border-b border-gray-700 min-w-[100px]">Impact</th>
                            <th className="px-2 md:px-3 py-2 border-b border-gray-700 min-w-[200px]">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {debrief.keyEvents.map((ev, idx) => (
                            <tr key={`ev_${idx}`} className="odd:bg-gray-900/40">
                              <td className="px-2 md:px-3 py-2 border-b border-gray-800 text-gray-200">{ev.round}</td>
                              <td className="px-2 md:px-3 py-2 border-b border-gray-800 text-gray-200">{ev.actor ?? '—'}</td>
                              <td className="px-2 md:px-3 py-2 border-b border-gray-800 text-gray-200">{ev.title}</td>
                              <td className={`px-2 md:px-3 py-2 border-b border-gray-800 ${impactClass(ev.impact)}`}>{ev.impact}</td>
                              <td className="px-2 md:px-3 py-2 border-b border-gray-800 text-gray-300">
                                <div className="whitespace-pre-wrap">{ev.description}</div>
                                {ev.causes && ev.causes.length > 0 && (
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] uppercase tracking-wide text-blue-200">Because:</span>
                                    {ev.causes.map((c, i) => (
                                      <CauseTag key={`debrief_ev_${idx}_c_${i}`} cause={c} logs={gameState.eventLog} />
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
              </div>
            )}

            {/* Human Actions Table */}
            {debrief.userActions && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-amber-200">Your Influential Actions</p>
                  <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full text-sm text-left border border-gray-700 rounded-md overflow-hidden">
                        <thead className="bg-gray-900/70 text-gray-300">
                          <tr>
                            <th className="px-2 md:px-3 py-2 border-b border-gray-700 whitespace-nowrap">Round</th>
                            <th className="px-2 md:px-3 py-2 border-b border-gray-700 min-w-[120px]">Action</th>
                            <th className="px-2 md:px-3 py-2 border-b border-gray-700 min-w-[100px]">Impact</th>
                            <th className="px-2 md:px-3 py-2 border-b border-gray-700 min-w-[150px]">Rationale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {debrief.userActions.length > 0 ? (
                            debrief.userActions.map((ac, idx) => (
                              <tr key={`act_${idx}`} className="odd:bg-gray-900/40">
                                <td className="px-2 md:px-3 py-2 border-b border-gray-800 text-gray-200">{ac.round}</td>
                                <td className="px-2 md:px-3 py-2 border-b border-gray-800 text-gray-200">{ac.title}</td>
                                <td className={`px-2 md:px-3 py-2 border-b border-gray-800 ${impactClass(ac.impact)}`}>{ac.impact}</td>
                                <td className="px-2 md:px-3 py-2 border-b border-gray-800 text-gray-300">{ac.rationale ?? '—'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="px-2 md:px-3 py-2 border-b border-gray-800 text-gray-400" colSpan={4}>No recorded human actions.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
              </div>
            )}
          </div>
        </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">Final Scores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {players
              .slice()
              .sort((a, b) => b.hiddenScore - a.hiddenScore)
              .map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${p.isHuman ? 'bg-blue-900/50 border border-blue-500' : 'bg-gray-700/80'}`}
                >
                  <div className="flex items-center flex-1 min-w-0 mr-4">
                    {typeof p.role.icon === 'function'
                      ? p.role.icon({ className: 'h-8 w-8 mr-4 text-blue-300 flex-shrink-0' })
                      : <span className="text-3xl mr-4 flex-shrink-0">{p.role.icon}</span>
                    }
                    <div className="flex-1 min-w-0">
                      <span className="font-bold block">{p.role.name}</span>
                      <span className="text-xs uppercase tracking-wide text-gray-400 block">{p.isHuman ? 'You' : 'AI Stakeholder'}</span>
                      <span className="text-xs italic text-amber-300 block mt-1 break-words">{p.role.hiddenObjective}</span>
                    </div>
                  </div>
                  <span className="text-xl font-mono flex-shrink-0">
                    {p.hiddenScore > 0 ? '+' : ''}
                    {p.hiddenScore}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {finalLogEntry && (
          <div className="bg-gray-800 rounded-lg p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-200">Final Round · Round {finalLogEntry.round}</p>
                <h3 className="text-2xl font-semibold text-white">
                  {finalLogEntry.event?.headline ?? 'Outcome Summary'}
                </h3>
                {finalLogEntry.event?.detail && (
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {finalLogEntry.event.detail}
                  </p>
                )}
                {finalLogEntry.citations && finalLogEntry.citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wide text-blue-200">Because:</span>
                    {finalLogEntry.citations.slice(0, 8).map((c, i) => (
                      <CauseTag key={`end_hdr_c_${i}`} cause={c as any} logs={gameState.eventLog} />
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Public Score After Round</p>
                <p className="text-3xl font-bold text-blue-300">{finalLogEntry.publicScoreAfter}%</p>
                {finalScoreChange !== null && (
                  <p className={`text-sm font-semibold ${finalScoreChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {finalScoreChange >= 0 ? '+' : ''}
                    {finalScoreChange}
                  </p>
                )}
              </div>
            </div>

            {finalLogEntry.roundSummary && (
              <div className="bg-gray-900/60 border border-gray-700 rounded-md p-4 space-y-2">
                <p className="text-xs uppercase tracking-wide text-blue-200">Round Summary</p>
                <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-wrap">{finalLogEntry.roundSummary}</p>
              </div>
            )}

            {/* Final Round Key Moments with contextual citations */}
            {finalLogEntry?.outcomeTimeline?.length ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-blue-200">Key Moments (Final Round)</p>
                <ol className="space-y-3">
                  {finalLogEntry.outcomeTimeline.map((item, index) => (
                    <li key={`end_km_${index}`} className="flex gap-3">
                      <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-blue-800 text-blue-200 font-semibold text-sm flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div className="flex-1 bg-gray-900/60 border border-gray-800 rounded-md p-3 space-y-1">
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-sm text-gray-200 leading-relaxed">{item.description}</p>
                        <p className="text-xs uppercase tracking-wide text-blue-300">Impact: <span className="normal-case font-medium text-blue-100">{item.impact}</span></p>
                        {Array.isArray((item as any).causes) && (item as any).causes.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] uppercase tracking-wide text-blue-200">Because:</span>
                            {(item as any).causes.map((c: any, i: number) => (
                              <CauseTag key={`end_km_${index}_c_${i}`} cause={c} logs={gameState.eventLog} />
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {/* Removed duplicate Key Moments block without causes to avoid duplication */}

            {finalLogEntry.counterfactualNote && (
              <div className="bg-gray-900/40 border border-blue-800/40 rounded-md p-4 text-sm text-blue-100/90">
                <span className="font-semibold uppercase tracking-wide text-blue-200">If No One Acted</span>
                <p className="mt-1 leading-relaxed">{finalLogEntry.counterfactualNote}</p>
              </div>
            )}

            {finalLogEntry.playerActions.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-gray-400">Actions Taken</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {finalLogEntry.playerActions.map((playerRound) => {
                    const matchingPlayer = players.find((p) => p.role.name === playerRound.roleName);
                    const roleIcon = matchingPlayer?.role.icon ?? ((props: React.SVGProps<SVGSVGElement>) => (
                      <span className="text-2xl" role="img" aria-label="role icon">❓</span>
                    ));
                    const hiddenUpdate = finalLogEntry.hiddenScoreChanges[playerRound.roleName];

                    return (
                      <div key={`${playerRound.roleName}_${finalLogEntry.round}`} className="bg-gray-900/70 border border-gray-700 rounded-md p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {roleIcon({ className: 'h-6 w-6 text-blue-300' })}
                            <span className="font-semibold text-white">{playerRound.roleName}</span>
                          </div>
                          {hiddenUpdate && (
                            <span className={`text-sm font-semibold ${hiddenUpdate.update >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                              {hiddenUpdate.update >= 0 ? '+' : ''}
                              {hiddenUpdate.update}
                            </span>
                          )}
                        </div>
                        <ul className="space-y-1 text-sm text-gray-300">
                          {playerRound.actions.length > 0 ? (
                            playerRound.actions.map((action, index) => (
                              <li key={`${playerRound.roleName}_${index}`} className="flex justify-between items-start gap-2">
                                <span className="leading-snug flex-1">{action.title}</span>
                                <span className="flex-shrink-0 inline-flex items-center text-xs font-semibold bg-gray-800 text-blue-300 px-2 py-0.5 rounded-full">
                                  {action.cost} AP
                                </span>
                              </li>
                            ))
                          ) : (
                            <li className="italic text-gray-500">No action submitted.</li>
                          )}
                        </ul>
                        {hiddenUpdate?.justification && (
                          <p className="text-xs text-amber-200/80 italic whitespace-pre-wrap">
                            {hiddenUpdate.justification}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onReset}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
          >
            Play Again
          </button>
          {onOpenFeedback && (
            <button
              onClick={onOpenFeedback}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg text-lg inline-flex items-center gap-2"
            >
              <ChatBubbleLeftIcon className="h-5 w-5" />
              Share Feedback
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
