import React from 'react';
import type { GameState, GameLogEntry } from '../../types';

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

