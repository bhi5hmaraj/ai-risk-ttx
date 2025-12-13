import React from 'react';
import type { GameState, Player, GameLogEntry } from '../../types';
import { GamePhase } from '../../types';
import { GAME_CONFIG } from '../../constants';
import { PauseIcon, PlayIcon, ClockIcon, Bars3Icon, Cog6ToothIcon, GlobeIcon, StarIcon, BoltIcon, ArrowPathIcon } from '../Icons';
import { SettingsMenu } from './SettingsMenu';
import { useUIStore } from '../../stores/uiStore';

interface StatusBarProps {
  gameState: GameState;
  timer: number;
  isPaused: boolean;
  onPauseClick: () => void;
  player: Player;
  maxRounds?: number;
  onOpenActionTree: () => void;
  canViewActionTree: boolean;
  onOpenFeedback?: () => void;
  onMakePublic?: () => void;
  showMakePublic?: boolean;
  scenarioAlreadyPublic?: boolean;
  availablePoints?: number;
  latestLogEntry?: GameLogEntry | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  gameState,
  timer,
  isPaused,
  onPauseClick,
  player,
  maxRounds,
  onOpenActionTree,
  canViewActionTree,
  onOpenFeedback,
  onMakePublic,
  showMakePublic,
  scenarioAlreadyPublic,
  availablePoints,
  latestLogEntry,
}) => {
  const { isSettingsOpen, setSettingsOpen } = useUIStore();
  const metricValue = gameState.coreMetric.value;
  const metricClass = metricValue > 60 ? 'text-success' : metricValue > 30 ? 'text-warning' : 'text-danger';
  const roundCap = typeof maxRounds === 'number' && maxRounds > 0 ? maxRounds : GAME_CONFIG.MAX_ROUNDS;

  // Calculate deltas from previous round
  const publicScoreDelta = latestLogEntry?.publicScoreChange ?? null;
  const hiddenScoreChanges = latestLogEntry?.hiddenScoreChanges ?? {};
  const personalScoreDelta = hiddenScoreChanges[player.role.name]?.update ?? null;

  return (
    <div className="fixed top-0 left-0 right-0 z-30 bg-bg/98 backdrop-blur-sm border-b border-border">
      <div className="max-w-[1920px] mx-auto px-2 py-1.5 flex items-center gap-2 text-xs">
        {/* Simulacra Banner with Expand Nav Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              const navbar = document.querySelector('nav');
              if (navbar) {
                const isCollapsed = navbar.classList.contains('-translate-y-full');
                if (isCollapsed) {
                  navbar.classList.remove('-translate-y-full');
                  navbar.classList.add('translate-y-0');
                }
              }
            }}
            className="p-1.5 bg-panel hover:bg-card rounded transition-colors border border-border"
            aria-label="Show navigation"
            title="Show navigation menu"
          >
            <Bars3Icon className="h-4 w-4 text-muted" />
          </button>
          <h1 className="text-base font-bold text-accent whitespace-nowrap">Simulacra</h1>
        </div>

        {/* Left: Role & Hidden Goal */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-panel border border-border rounded flex-shrink-0">
            {typeof player.role.icon === 'function'
              ? player.role.icon({ className: 'h-4 w-4 text-accent' })
              : <span className="text-sm">{player.role.icon}</span>
            }
            <span className="font-semibold text-text whitespace-nowrap">{player.role.name}</span>
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
          <Metric label="Round" value={`${gameState.round}/${roundCap}`} accent="text-accent" icon={ArrowPathIcon} />
          <Metric
            label={gameState.coreMetric.name}
            value={`${metricValue}%`}
            accent={metricClass}
            icon={GlobeIcon}
            delta={publicScoreDelta}
          />
          <Metric
            label="Personal Score"
            value={player.hiddenScore.toString()}
            accent="text-amber-300"
            icon={StarIcon}
            delta={personalScoreDelta}
          />
          {typeof availablePoints === 'number' && gameState.phase === GamePhase.ACTION && (
            <Metric
              label={`Action Points (max ${GAME_CONFIG.MAX_ACTION_POINTS})`}
              value={`${availablePoints} AP`}
              accent={availablePoints > 1 ? 'text-success' : availablePoints === 0 ? 'text-danger' : 'text-warning'}
              icon={BoltIcon}
            />
          )}

          {/* Timer - Shows elapsed time */}
          {gameState.phase === GamePhase.ACTION && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-panel border border-border rounded">
              <ClockIcon className="h-4 w-4 text-muted" />
              {!isPaused && (() => {
                // Calculate elapsed time (timer counts down from GAME_CONFIG.ACTION_PHASE_SECONDS)
                const elapsed = GAME_CONFIG.ACTION_PHASE_SECONDS - timer;
                return (
                  <span className="font-mono text-accent">
                    {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
                  </span>
                );
              })()}
              {isPaused && <span className="text-muted">Paused</span>}
              <button
                onClick={onPauseClick}
                className="p-0.5 rounded hover:bg-card transition-colors"
                aria-label={isPaused ? 'Resume game' : 'Pause game'}
              >
                {isPaused ? <PlayIcon className="h-3.5 w-3.5 text-text" /> : <PauseIcon className="h-3.5 w-3.5 text-text" />}
              </button>
            </div>
          )}
        </div>

        {/* Right: Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0 relative">
          {onOpenFeedback && (
            <button
              onClick={onOpenFeedback}
              className="px-2 py-1 rounded text-[10px] font-semibold bg-accent hover:bg-accent-strong text-bg transition-colors whitespace-nowrap"
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
                  ? 'bg-panel cursor-not-allowed opacity-60 text-muted border border-border'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
              title={scenarioAlreadyPublic ? 'Already shared with community' : 'Share scenario with community'}
            >
              {scenarioAlreadyPublic ? '✓' : '📢'}
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(!isSettingsOpen)}
            className="px-2 py-1 rounded bg-panel hover:bg-card text-text transition-colors flex items-center gap-1 border border-border"
            aria-label="Settings"
            title="Settings"
          >
            <Cog6ToothIcon className="h-4 w-4" />
          </button>
          <SettingsMenu
            onOpenActionTree={onOpenActionTree}
            canViewActionTree={canViewActionTree}
          />
        </div>
      </div>
    </div>
  );
};

interface MetricProps {
  label: string;
  value: string;
  accent: string;
  icon?: React.ComponentType<{ className?: string }>;
  delta?: number | null;
}

const Metric: React.FC<MetricProps> = ({ label, value, accent, icon: Icon, delta }) => (
  <div
    className="flex items-center gap-1.5 px-2 py-1 bg-panel border border-border rounded min-w-[50px]"
    title={label}
  >
    {Icon && <Icon className={`h-3.5 w-3.5 ${accent}`} />}
    <span className={`text-sm font-semibold ${accent} leading-none`}>{value}</span>
    {delta !== null && delta !== undefined && (
      <span className={`text-xs font-semibold leading-none ${delta >= 0 ? 'text-success' : 'text-danger'}`}>
        {delta >= 0 ? '+' : ''}{delta}
      </span>
    )}
  </div>
);
