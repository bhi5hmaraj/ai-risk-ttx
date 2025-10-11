import React from 'react';
import type { GameState } from '../../types';
import { GamePhase } from '../../types';
import { GAME_CONFIG } from '../../constants';
import { PauseIcon, PlayIcon } from '../Icons';

interface GameStatusPanelProps {
  gameState: GameState;
  timer: number;
  isPaused: boolean;
  onPauseClick: () => void;
}

export const GameStatusPanel: React.FC<GameStatusPanelProps> = ({ gameState, timer, isPaused, onPauseClick }) => {
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
