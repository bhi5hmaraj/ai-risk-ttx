import React, { useMemo, useState } from 'react';
import type { ActionOption, Player } from '../../types';
import { GAME_CONFIG } from '../../constants';
import { LoadingSpinner, CheckCircleIcon, PauseIcon } from '../Icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useRotatingJoke } from '@/lib/loadingJokes';

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
  const human = useMemo(() => players.find((p) => p.isHuman) || null, [players]);
  const confirmDisabled = isLoading || isPaused;
  const joke = useRotatingJoke(4000); // Rotate jokes every 4 seconds

  console.log('[ActionSelection] Render:', {
    hasSubmitted,
    allAIsDone,
    jokeLength: joke?.length,
    aiPlayers: aiPlayers.length,
    aiCompletionStatus
  });

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
      <div className="bg-card border border-border rounded-lg p-6 sticky top-6 text-center">
        {human && Array.isArray(human.actions) && human.actions.length > 0 && (
          <div className="mb-5 text-left">
            <h4 className="text-lg font-semibold mb-2">Your submitted actions</h4>
            <ul className="space-y-2">
              {human.actions.map((a) => (
                <li key={a.title} className="bg-panel border border-border rounded px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-text font-medium">{a.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-panel text-accent border border-border">{a.cost} AP</span>
                  </div>
                  {a.description && <p className="text-xs text-muted mt-1 whitespace-pre-line">{a.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <h3 className="text-xl font-bold mb-4">{allAIsDone ? 'Generating next scenario...' : 'Waiting for Opponents...'}</h3>
        {!allAIsDone && (
          <>
            <div className="space-y-3 text-left">
              {aiPlayers.map((player) => {
                const isComplete = aiCompletionStatus[player.role.name];
                return (
                  <div
                    key={player.id}
                    className={`flex items-center p-3 rounded-lg transition-all duration-300 bg-panel border border-border`}
                  >
                    {isComplete ? <CheckCircleIcon className="h-6 w-6 text-success mr-3" /> : <LoadingSpinner />}
                    <span className={isComplete ? 'text-text' : 'text-muted'}>{player.role.name}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-muted italic text-center">
              "{joke}"
            </p>
          </>
        )}
        {allAIsDone && (
          <div className="flex flex-col items-center">
            <LoadingSpinner />
            <p className="mt-4 text-sm text-muted italic text-center">
              "{joke}"
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 sticky top-6">
      {isPaused && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
          <PauseIcon className="h-12 w-12 text-accent mb-4" />
          <h3 className="text-xl font-bold">Game Paused</h3>
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-text">Your Actions</h3>
          <p className="text-sm text-muted">
            You have {availablePoints} AP available (max {GAME_CONFIG.MAX_ACTION_POINTS}).
          </p>
          <p className="text-xs text-muted mt-1">
            +{GAME_CONFIG.ACTION_POINTS_PER_ROUND} AP each round. Unused points carry over.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase tracking-wide text-muted">Points Remaining</span>
          <div className="mt-1">
            <Badge tone={pointsRemaining > 1 ? 'success' : pointsRemaining === 0 ? 'danger' : 'warning'} className="text-sm px-3 py-1">
              {pointsRemaining}
            </Badge>
          </div>
        </div>
      </div>
      {isLoading && !options.length ? (
        <div className="flex flex-col justify-center items-center h-48 px-4">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-muted italic text-center">
            "{joke}"
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {options.map((opt) => {
            const isSelected = selected.some((s) => s.title === opt.title);
            const canSelect = pointsRemaining >= opt.cost || isSelected;
            return (
              <button
                key={opt.title}
                type="button"
                onClick={() => toggleAction(opt)}
                disabled={!canSelect && !isSelected}
                className={`w-full text-left p-3 rounded-md border transition-colors focus:outline-none focus-visible:border-accent ${
                  isSelected
                    ? 'border-accent bg-[var(--accent-soft)] shadow-inner'
                    : canSelect
                    ? 'border-border bg-panel hover:border-accent'
                    : 'border-border bg-panel text-muted opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`font-semibold ${isSelected ? 'text-text' : 'text-text'}`}>{opt.title}</p>
                    <p className={`mt-2 text-sm leading-snug text-muted whitespace-pre-line`}>{opt.description}</p>
                  </div>
                  <Badge tone="accent" className="text-xs px-2 py-0.5 shrink-0">{opt.cost} AP</Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-6 pt-4 border-t border-border">
        <Button onClick={() => onConfirm(selected)} disabled={confirmDisabled} className="w-full h-11 text-base">
          Confirm Actions
        </Button>
      </div>
    </div>
  );
};
