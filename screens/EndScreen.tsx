import React from 'react';
import type { GameState, Player } from '../types';

interface EndScreenProps {
  gameState: GameState;
  players: Player[];
  onReset: () => void;
}

export const EndScreen: React.FC<EndScreenProps> = ({ gameState, players, onReset }) => {
  const finalLogEntry = gameState.eventLog[gameState.eventLog.length - 1] ?? null;
  const finalScoreChange = finalLogEntry?.publicScoreChange ?? null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-10 pt-24 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-8">
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
                  <div className="flex items-center">
                    {p.role.icon({ className: 'h-8 w-8 mr-4 text-blue-300' })}
                    <div>
                      <span className="font-bold block">{p.role.name}</span>
                      <span className="text-xs uppercase tracking-wide text-gray-400">{p.isHuman ? 'You' : 'AI Stakeholder'}</span>
                    </div>
                  </div>
                  <span className="text-xl font-mono">
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

            {finalLogEntry.outcomeTimeline?.length ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-blue-200">Key Moments</p>
                <ol className="space-y-3">
                  {finalLogEntry.outcomeTimeline.map((item, index) => (
                    <li key={`${item.title}_${index}`} className="flex gap-3">
                      <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-blue-800 text-blue-200 font-semibold text-sm flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div className="flex-1 bg-gray-900/70 border border-gray-700 rounded-md p-3 space-y-1">
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="text-sm text-gray-200 leading-relaxed">{item.description}</p>
                        <p className="text-xs uppercase tracking-wide text-blue-300">Impact: <span className="normal-case font-medium text-blue-100">{item.impact}</span></p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

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

        <div className="flex justify-center">
          <button
            onClick={onReset}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-12 rounded-lg text-lg"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
