import React, { useMemo, useState } from 'react';
import type { ActionOption, Player } from '../../types';
import { GAME_CONFIG } from '../../constants';
import { LoadingSpinner, CheckCircleIcon, PauseIcon } from '../Icons';

interface ActionSelectionProps {
  options: ActionOption[];
  onConfirm: (actions: ActionOption[]) => void;
  isLoading: boolean;
  hasSubmitted: boolean;
  isPaused: boolean;
  players: Player[];
  aiCompletionStatus: Record<string, boolean>;
  availablePoints: number;
}

export const ActionSelection: React.FC<ActionSelectionProps> = ({
  options,
  onConfirm,
  isLoading,
  hasSubmitted,
  isPaused,
  players,
  aiCompletionStatus,
  availablePoints,
}) => {
  const [selected, setSelected] = useState<ActionOption[]>([]);
  const pointsUsed = useMemo(() => selected.reduce((acc, curr) => acc + curr.cost, 0), [selected]);
  const pointsRemaining = availablePoints - pointsUsed;
  const aiPlayers = useMemo(() => players.filter((p) => !p.isHuman), [players]);
  const allAIsDone = useMemo(() => aiPlayers.every((p) => aiCompletionStatus[p.role.name]), [aiPlayers, aiCompletionStatus]);
  const confirmDisabled = isLoading || isPaused;

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
          <p className="text-sm text-gray-400">
            You have {availablePoints} AP available (max {GAME_CONFIG.MAX_ACTION_POINTS}).
          </p>
          <p className="text-xs text-gray-500 mt-1">
            +{GAME_CONFIG.ACTION_POINTS_PER_ROUND} AP each round. Unused points carry over.
          </p>
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

