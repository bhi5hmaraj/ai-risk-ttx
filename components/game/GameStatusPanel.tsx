import React, { useState } from 'react';
import type { GameState, Player } from '../../types';
import { GamePhase } from '../../types';
import { GAME_CONFIG } from '../../constants';
import { PauseIcon, PlayIcon } from '../Icons';

interface GameStatusPanelProps {
  gameState: GameState;
  timer: number;
  isPaused: boolean;
  onPauseClick: () => void;
  player: Player;
  isCustomScenario?: boolean;
  onMakePublic?: () => void;
  onOpenFeedback?: () => void;
}

export const GameStatusPanel: React.FC<GameStatusPanelProps> = ({ gameState, timer, isPaused, onPauseClick, player, isCustomScenario, onMakePublic, onOpenFeedback }) => {
  const metricValue = gameState.coreMetric.value;
  const metricClass = metricValue > 60 ? 'text-green-400' : metricValue > 30 ? 'text-yellow-400' : 'text-red-400';
  const [showHiddenObjective, setShowHiddenObjective] = useState(false);

  return (
    <div className="bg-gray-800 rounded-lg p-4 md:p-5 mb-6 space-y-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gray-700 p-3 rounded-lg">
            {player.role.icon({ className: 'h-9 w-9 text-blue-300' })}
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-blue-200 font-semibold">Your Role</p>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white leading-tight">{player.role.name}</h2>
              <div className="flex items-center gap-2">
                {isCustomScenario && onMakePublic && (
                  <button
                    onClick={onMakePublic}
                    className="px-3 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors"
                    title="Share this scenario with the community"
                  >
                    📢 Make Public
                  </button>
                )}
                {onOpenFeedback && (
                  <button
                    onClick={onOpenFeedback}
                    className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
                    title="Share your feedback about this game"
                  >
                    💬 Feedback
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 lg:flex-nowrap lg:gap-8 w-full lg:w-auto">
          <MetricPill label="Round" value={`${gameState.round} / ${GAME_CONFIG.MAX_ROUNDS}`} accent="text-blue-300" />
          <MetricPill label={gameState.coreMetric.name} value={`${metricValue}%`} accent={metricClass} />
          <MetricPill label="Personal Score" value={player.hiddenScore.toString()} accent="text-amber-300" />
          <div className="flex items-center gap-3">
            <div className="text-xs uppercase tracking-[0.3em] text-gray-400">{isPaused ? 'Paused' : 'Time Left'}</div>
            {!isPaused && (
              <div className={`text-xl md:text-2xl text-blue-300 font-mono ${timer <= 30 && timer > 0 ? 'timer-flash' : ''}`}>
                {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
              </div>
            )}
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
      </div>
      <div className="bg-gray-900/70 border border-gray-700 rounded-md p-4 space-y-2.5">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Public Objective</p>
          <p className="text-sm text-gray-200 leading-relaxed">{player.role.publicObjective}</p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setShowHiddenObjective((prev) => !prev)}
            className="flex items-center justify-between w-full text-sm font-semibold text-amber-300"
          >
            <span>Hidden Objective</span>
            <span className="text-xs uppercase tracking-wide text-gray-400">
              {showHiddenObjective ? 'Hide' : 'Reveal'}
            </span>
          </button>
          {showHiddenObjective && <p className="mt-2 text-sm text-amber-200 italic leading-relaxed">{player.role.hiddenObjective}</p>}
        </div>
      </div>
      {(player.role.resources.length > 0 || player.role.constraints.length > 0) && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-md p-4 space-y-3">
          {player.role.resources.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Resources</p>
              <ul className="mt-1 text-sm text-gray-300 list-disc list-inside space-y-1">
                {player.role.resources.map((resource) => (
                  <li key={resource}>{resource}</li>
                ))}
              </ul>
            </div>
          )}
          {player.role.constraints.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Constraints</p>
              <ul className="mt-1 text-sm text-gray-300 list-disc list-inside space-y-1">
                {player.role.constraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface MetricPillProps {
  label: string;
  value: string;
  accent: string;
}

const MetricPill: React.FC<MetricPillProps> = ({ label, value, accent }) => (
  <div className="flex flex-col items-center lg:items-start min-w-[120px]">
    <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-semibold">{label}</span>
    <span className={`text-xl md:text-2xl font-semibold ${accent}`}>{value}</span>
  </div>
);
