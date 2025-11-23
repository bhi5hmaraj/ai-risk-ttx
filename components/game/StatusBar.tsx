import React from 'react';
import type { GameState, Player } from '../../types';
import { GamePhase } from '../../types';
import { GAME_CONFIG } from '../../constants';
import { PauseIcon, PlayIcon, ClockIcon } from '../Icons';

interface StatusBarProps {
  gameState: GameState;
  timer: number;
  isPaused: boolean;
  onPauseClick: () => void;
  player: Player;
  maxRounds?: number;
  onToggleHistory: () => void;
  onOpenActionTree: () => void;
  isHistoryOpen: boolean;
  canViewActionTree: boolean;
  onOpenFeedback?: () => void;
  onMakePublic?: () => void;
  showMakePublic?: boolean;
  scenarioAlreadyPublic?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  gameState,
  timer,
  isPaused,
  onPauseClick,
  player,
  maxRounds,
  onToggleHistory,
  onOpenActionTree,
  isHistoryOpen,
  canViewActionTree,
  onOpenFeedback,
  onMakePublic,
  showMakePublic,
  scenarioAlreadyPublic,
}) => {
  const metricValue = gameState.coreMetric.value;
  const metricClass = metricValue > 60 ? 'text-green-400' : metricValue > 30 ? 'text-yellow-400' : 'text-red-400';
  const roundCap = typeof maxRounds === 'number' && maxRounds > 0 ? maxRounds : GAME_CONFIG.MAX_ROUNDS;

  return (
    <div className="fixed top-0 left-0 right-0 z-30 bg-gray-900/98 backdrop-blur-sm border-b border-gray-800">
      <div className="max-w-[1920px] mx-auto px-2 py-1.5 flex items-center gap-2 text-xs">
        {/* Simulacra Banner */}
        <div className="flex-shrink-0">
          <h1 className="text-base font-bold text-blue-300 whitespace-nowrap">Simulacra</h1>
        </div>

        {/* Left: Role & Hidden Goal */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded flex-shrink-0">
            {typeof player.role.icon === 'function'
              ? player.role.icon({ className: 'h-4 w-4 text-blue-300' })
              : <span className="text-sm">{player.role.icon}</span>
            }
            <span className="font-semibold text-white whitespace-nowrap">{player.role.name}</span>
          </div>
          <div
            className="px-2 py-1 bg-amber-900/20 border border-amber-700/30 rounded text-amber-400 italic whitespace-nowrap overflow-hidden text-ellipsis"
            title={player.role.hiddenObjective}
          >
            {player.role.hiddenObjective}
          </div>
        </div>

        {/* Center: Metrics */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Metric label="Round" value={`${gameState.round}/${roundCap}`} accent="text-blue-300" />
          <Metric label={gameState.coreMetric.name} value={`${metricValue}%`} accent={metricClass} />
          <Metric label="Score" value={player.hiddenScore.toString()} accent="text-amber-300" />

          {/* Timer */}
          {gameState.phase === GamePhase.ACTION && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 rounded">
              <ClockIcon className="h-4 w-4 text-gray-400" />
              {!isPaused && (
                <span className={`font-mono ${timer <= 30 && timer > 0 ? 'timer-flash' : 'text-blue-300'}`}>
                  {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                </span>
              )}
              {isPaused && <span className="text-gray-400">Paused</span>}
              <button
                onClick={onPauseClick}
                className="p-0.5 rounded hover:bg-gray-700 transition-colors"
                aria-label={isPaused ? 'Resume game' : 'Pause game'}
              >
                {isPaused ? <PlayIcon className="h-3.5 w-3.5 text-white" /> : <PauseIcon className="h-3.5 w-3.5 text-white" />}
              </button>
            </div>
          )}
        </div>

        {/* Right: Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onToggleHistory}
            className="px-2 py-1 rounded text-[10px] font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-colors whitespace-nowrap"
          >
            {isHistoryOpen ? 'Hide' : 'History'}
          </button>
          <button
            onClick={onOpenActionTree}
            disabled={!canViewActionTree}
            className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors whitespace-nowrap ${
              canViewActionTree ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            Tree
          </button>
          {onOpenFeedback && (
            <button
              onClick={onOpenFeedback}
              className="px-2 py-1 rounded text-[10px] font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap"
            >
              💬
            </button>
          )}
          {onMakePublic && (
            <button
              onClick={onMakePublic}
              disabled={scenarioAlreadyPublic}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors whitespace-nowrap ${
                scenarioAlreadyPublic
                  ? 'bg-gray-600 cursor-not-allowed opacity-60 text-gray-400'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
              title={scenarioAlreadyPublic ? 'Already shared with community' : 'Share scenario with community'}
            >
              {scenarioAlreadyPublic ? '✓' : '📢'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface MetricProps {
  label: string;
  value: string;
  accent: string;
}

const Metric: React.FC<MetricProps> = ({ label, value, accent }) => (
  <div
    className="flex items-center gap-1 px-2 py-1 bg-gray-800 rounded min-w-[50px]"
    title={label}
  >
    <span className={`text-sm font-semibold ${accent} leading-none`}>{value}</span>
  </div>
);
