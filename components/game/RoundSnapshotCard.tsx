import React from 'react';
import type { GameState, GameLogEntry } from '../../types';
import { CauseTag } from './CauseTag';

interface RoundSnapshotCardProps {
  gameState: GameState;
  latestLogEntry: GameLogEntry | null;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  onViewActionTree: () => void;
  canViewActionTree: boolean;
}

export const RoundSnapshotCard: React.FC<RoundSnapshotCardProps> = ({
  gameState,
  latestLogEntry,
  onToggleHistory,
  isHistoryOpen,
  onViewActionTree,
  canViewActionTree,
}) => {
  const metric = gameState.coreMetric;
  const lastDelta = latestLogEntry?.publicScoreChange ?? null;
  const lastRoundNumber = latestLogEntry?.round ?? (gameState.round > 1 ? gameState.round - 1 : 0);
  const hasLastRound = Boolean(latestLogEntry);
  const playerActions = latestLogEntry?.playerActions ?? [];
  const hiddenScoreChanges = latestLogEntry?.hiddenScoreChanges ?? {};
  const lastPublicScore = hasLastRound ? latestLogEntry?.publicScoreAfter ?? metric.value : metric.value;

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="bg-blue-900/30 border border-blue-700/40 rounded-md p-4 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-blue-200">
              {hasLastRound ? `Last Round · Round ${lastRoundNumber}` : 'Your campaign is about to begin'}
            </p>
            <h3 className="text-xl font-semibold text-white">
              {hasLastRound
                ? latestLogEntry?.event?.headline ?? 'Latest outcomes'
                : 'Play your first round to see how the story unfolds'}
            </h3>
            {hasLastRound && latestLogEntry?.event?.detail && (
              <p className="text-xs text-blue-100/80 leading-relaxed whitespace-pre-wrap">
                {latestLogEntry.event.detail}
              </p>
            )}
            {hasLastRound && latestLogEntry?.citations && latestLogEntry.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-blue-200">Because:</span>
                {latestLogEntry.citations.slice(0,6).map((c, i) => (
                  <CauseTag key={`hdr_${lastRoundNumber}_c_${i}`} cause={c as any} logs={gameState.eventLog} />
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-blue-200">Public Score After Round</p>
            <p className="text-3xl font-bold text-blue-100">{lastPublicScore}%</p>
            {lastDelta !== null && gameState.round > 0 && (
              <p className={`text-sm font-semibold ${lastDelta >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {lastDelta >= 0 ? '+' : ''}
                {lastDelta}
              </p>
            )}
          </div>
        </div>

        {hasLastRound ? (
          <div className="space-y-4">
            <div className="bg-blue-950/60 border border-blue-700/30 rounded-md p-4 space-y-2">
              <p className="text-xs uppercase tracking-wide text-blue-200">Round Summary</p>
              <p className="text-sm text-blue-50 leading-relaxed whitespace-pre-wrap">{latestLogEntry?.roundSummary}</p>
            </div>

            {latestLogEntry?.outcomeTimeline?.length ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-blue-200">Key Moments</p>
                <ol className="space-y-3">
                  {latestLogEntry.outcomeTimeline.map((item, index) => (
                    <li key={`${item.title}_${index}`} className="flex gap-3">
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
                              <CauseTag key={`km_${lastRoundNumber}_${index}_c_${i}`} cause={c} logs={gameState.eventLog} />
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {playerActions.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-blue-200">Actions &amp; Score Changes</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {playerActions.map((playerAction) => {
                    const hiddenUpdate = hiddenScoreChanges[playerAction.roleName];
                    return (
                      <div key={`${playerAction.roleName}_${lastRoundNumber}`} className="bg-gray-900/60 border border-gray-800 rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{playerAction.roleName}</span>
                          {hiddenUpdate && (
                            <span
                              className={`text-sm font-semibold ${
                                hiddenUpdate.update >= 0 ? 'text-green-300' : 'text-red-300'
                              }`}
                            >
                              {hiddenUpdate.update >= 0 ? '+' : ''}
                              {hiddenUpdate.update}
                            </span>
                          )}
                        </div>
                        <ul className="space-y-1 text-sm text-gray-300">
                          {playerAction.actions.length > 0 ? (
                            playerAction.actions.map((action, idx) => (
                              <li key={`${playerAction.roleName}_${idx}`} className="flex justify-between items-start gap-2">
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

            {latestLogEntry?.counterfactualNote && (
              <div className="bg-blue-950/40 border border-blue-800/40 rounded-md p-4 text-sm text-blue-100/90">
                <span className="font-semibold uppercase tracking-wide text-blue-200">If No One Acted</span>
                <p className="mt-1 leading-relaxed">{latestLogEntry.counterfactualNote}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-blue-950/60 border border-blue-700/30 rounded-md p-4">
            <p className="text-sm text-blue-100/80 leading-relaxed">
              The AI Game Master will summarize your previous round here once actions are submitted.
            </p>
          </div>
        )}
      </div>

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
    </div>
  );
};
