import React, { useMemo, useState, useEffect } from 'react';
import type { GameState, GameLogEntry, ActionOption, Player } from '../../types';
import { CauseTag } from './CauseTag';
import { LoadingSpinner, CheckCircleIcon } from '../Icons';
import { Button } from '@/components/ui/Button';
import { useRotatingJoke } from '@/lib/loadingJokes';
import { useUIStore } from '../../stores/uiStore';

interface RoundSnapshotCardProps {
  gameState: GameState;
  latestLogEntry: GameLogEntry | null;
  players: any[];
  actionOptions: ActionOption[];
  onConfirmActions: (actions: ActionOption[]) => void;
  isLoading: boolean;
  hasSubmitted: boolean;
  isPaused: boolean;
  aiCompletionStatus: Record<string, boolean>;
  availablePoints: number;
  humanPlayer: Player;
}

export const RoundSnapshotCard: React.FC<RoundSnapshotCardProps> = ({
  gameState,
  latestLogEntry,
  players,
  actionOptions,
  onConfirmActions,
  isLoading,
  hasSubmitted,
  isPaused,
  aiCompletionStatus,
  availablePoints,
  humanPlayer,
}) => {
  const { fontSize } = useUIStore();
  const metric = gameState.coreMetric;
  const lastDelta = latestLogEntry?.publicScoreChange ?? null;
  const lastRoundNumber = latestLogEntry?.round ?? (gameState.round > 1 ? gameState.round - 1 : 0);
  const hasLastRound = Boolean(latestLogEntry);
  const playerActions = latestLogEntry?.playerActions ?? [];
  const hiddenScoreChanges = latestLogEntry?.hiddenScoreChanges ?? {};
  const lastPublicScore = hasLastRound ? latestLogEntry?.publicScoreAfter ?? metric.value : metric.value;

  // Font size mappings
  const fontSizes = {
    title: fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm',
    body: fontSize === 'small' ? 'text-[11px]' : fontSize === 'large' ? 'text-sm' : 'text-xs',
    caption: fontSize === 'small' ? 'text-[10px]' : fontSize === 'large' ? 'text-xs' : 'text-[11px]',
  };

  // Action selection state and logic
  const [selected, setSelected] = useState<ActionOption[]>([]);
  const pointsUsed = useMemo(() => selected.reduce((acc, curr) => acc + curr.cost, 0), [selected]);
  const aiPlayers = useMemo(() => players.filter((p) => !p.isHuman), [players]);
  const allAIsDone = useMemo(() => aiPlayers.every((p) => aiCompletionStatus[p.role.name]), [aiPlayers, aiCompletionStatus]);
  const confirmDisabled = isLoading || isPaused;
  const joke = useRotatingJoke(4000);

  // Expand/collapse state for details
  const [expandedMoments, setExpandedMoments] = useState<Set<number>>(new Set());
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const toggleMoment = (index: number) => {
    setExpandedMoments(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleActionExpand = (title: string) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  // Reset selected actions when round changes or when submitted
  useEffect(() => {
    setSelected([]);
  }, [gameState.round, hasSubmitted]);

  const toggleAction = (option: ActionOption) => {
    if (hasSubmitted || isPaused) return;
    const isSelected = selected.some((s) => s.title === option.title);
    if (isSelected) {
      setSelected(selected.filter((s) => s.title !== option.title));
    } else if (pointsUsed + option.cost <= availablePoints) {
      setSelected([...selected, option]);
    }
  };

  // "This Round" = most recent completed round's key moments (latestLogEntry)
  // "Last Round" = second-to-last completed round's key moments
  // As rounds progress, current becomes last, and new results come into current
  const thisRoundMoments = latestLogEntry?.outcomeTimeline ?? null;
  const lastRoundMoments = gameState.eventLog.length >= 2
    ? gameState.eventLog[gameState.eventLog.length - 2]?.outcomeTimeline ?? null
    : null;

  // Render a single key moment card
  const renderMomentCard = (item: any, index: number, keyPrefix: string) => {
    const momentKey = `${keyPrefix}_${index}`;
    const isExpanded = expandedMoments.has(index + (keyPrefix === 'last' ? 1000 : 0)); // Offset for last round
    const toggleKey = index + (keyPrefix === 'last' ? 1000 : 0);

    return (
      <div key={momentKey} className="bg-card border border-border rounded p-2">
        <button
          type="button"
          onClick={() => toggleMoment(toggleKey)}
          className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          <div className="flex items-start gap-2">
            <div className="h-5 w-5 flex-shrink-0 rounded-full bg-panel text-accent font-bold text-xs flex items-center justify-center border border-border">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`${fontSizes.title} font-semibold text-text break-words`}>{item.title}</p>
                <span className={`text-muted text-xs flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
              </div>
            </div>
          </div>
        </button>
        {isExpanded && (
          <div className="mt-2 pl-7">
            <p className={`${fontSizes.body} text-muted leading-relaxed break-words`}>{item.description}</p>
            <p className={`${fontSizes.body} mt-1.5 break-words text-text`}>{item.impact}</p>
            {/* Cause tags - inside expanded section */}
            {item.causes && item.causes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.causes.map((cause: any, causeIdx: number) => (
                  <CauseTag key={`${momentKey}_c_${causeIdx}`} cause={cause} logs={gameState.eventLog} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-2">
      {/* Sections Stacked as Rows */}
      <div className="flex flex-col gap-4">
        {/* SECTION 0: Your Role */}
        <div className="bg-panel border border-border rounded-md p-2">
          {collapsedSections.has('role') ? (
            <button
              onClick={() => toggleSection('role')}
              className="w-full flex items-center gap-2 hover:bg-card rounded p-1 transition-colors"
              aria-label="Expand Your Role"
            >
              <span className="text-accent text-sm">+</span>
              <p className="text-sm uppercase tracking-wide text-accent font-semibold">Your Role</p>
            </button>
          ) : (
            <div className="flex gap-2">
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <button
                  onClick={() => toggleSection('role')}
                  className="p-1 hover:bg-card rounded transition-colors"
                  aria-label="Collapse Your Role"
                >
                  <span className="text-accent text-xs">−</span>
                </button>
                <p className="text-xs uppercase tracking-wide text-accent font-semibold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Your Role</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="space-y-3">
                  {/* Role Name with Icon */}
                  <div className="flex items-center gap-2">
                    {typeof humanPlayer.role.icon === 'function'
                      ? humanPlayer.role.icon({ className: 'h-6 w-6 text-accent' })
                      : <span className="text-2xl">{humanPlayer.role.icon}</span>
                    }
                    <h3 className="text-base font-bold text-text">{humanPlayer.role.name}</h3>
                  </div>

                  {/* Hidden Objective */}
                  <div className="bg-amber-900/20 border border-amber-700/30 rounded p-2">
                    <p className="text-xs uppercase tracking-wide text-amber-400 font-semibold mb-1">Secret Objective</p>
                    <p className="text-sm text-amber-300 italic">{humanPlayer.role.hiddenObjective}</p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-card border border-border rounded p-2">
                      <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Personal Score</p>
                      <p className="text-lg font-bold text-amber-300">{humanPlayer.hiddenScore}</p>
                    </div>
                    <div className="bg-card border border-border rounded p-2">
                      <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Action Points</p>
                      <p className={`text-lg font-bold ${availablePoints > 1 ? 'text-success' : availablePoints === 0 ? 'text-danger' : 'text-warning'}`}>
                        {availablePoints} AP
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 1: Key Moments - Side by Side */}
        <div className="bg-panel border border-border rounded-md p-2">
          {collapsedSections.has('moments') ? (
            <button
              onClick={() => toggleSection('moments')}
              className="w-full flex items-center gap-2 hover:bg-card rounded p-1 transition-colors"
              aria-label="Expand Key Moments"
            >
              <span className="text-accent text-sm">+</span>
              <p className="text-sm uppercase tracking-wide text-accent font-semibold">Key Moments</p>
            </button>
          ) : (
            <div className="flex gap-2">
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <button
                  onClick={() => toggleSection('moments')}
                  className="p-1 hover:bg-card rounded transition-colors"
                  aria-label="Collapse Key Moments"
                >
                  <span className="text-accent text-xs">−</span>
                </button>
                <p className="text-xs uppercase tracking-wide text-accent font-semibold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Key Moments</p>
              </div>
              <div className="flex-1 min-w-0">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
              {/* LATEST RESULTS Column */}
              <div className="min-w-0">
                <h4 className={`${fontSizes.body} font-semibold text-accent mb-2 uppercase tracking-wide`}>
                  {latestLogEntry ? `Round ${latestLogEntry.round}` : 'Latest'}
                </h4>
                {thisRoundMoments && thisRoundMoments.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {thisRoundMoments.map((item, index) => renderMomentCard(item, index, 'this'))}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded p-3 text-center">
                    <p className={`${fontSizes.body} text-muted italic`}>
                      Key moments will appear after first round...
                    </p>
                  </div>
                )}
              </div>

              {/* Vertical Divider */}
              <div className="w-px bg-border self-stretch" />

              {/* PREVIOUS RESULTS Column */}
              <div className="min-w-0">
                <h4 className={`${fontSizes.body} font-semibold text-accent mb-2 uppercase tracking-wide`}>
                  {gameState.eventLog.length >= 2 ? `Round ${gameState.eventLog[gameState.eventLog.length - 2]?.round}` : 'Previous'}
                </h4>
                {lastRoundMoments && lastRoundMoments.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {lastRoundMoments.map((item, index) => renderMomentCard(item, index, 'last'))}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded p-3 text-center">
                    <p className={`${fontSizes.body} text-muted italic`}>
                      No previous round yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Your Actions (moved above Score Δ) */}
        <div className="bg-panel border border-border rounded-md p-2 relative">
          {collapsedSections.has('actions') ? (
            <button
              onClick={() => toggleSection('actions')}
              className="w-full flex items-center gap-2 hover:bg-card rounded p-1 transition-colors"
              aria-label="Expand Your Actions"
            >
              <span className="text-accent text-sm">+</span>
              <p className="text-sm uppercase tracking-wide text-accent font-semibold">Your Actions</p>
            </button>
          ) : (
            <div className="flex gap-2">
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <button
                  onClick={() => toggleSection('actions')}
                  className="p-1 hover:bg-card rounded transition-colors"
                  aria-label="Collapse Your Actions"
                >
                  <span className="text-accent text-xs">−</span>
                </button>
                <p className="text-xs uppercase tracking-wide text-accent font-semibold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Your Actions</p>
              </div>
              <div className="flex-1 min-w-0 relative">
            {isPaused && (
              <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
                <div className="h-12 w-12 text-blue-400 mb-4">⏸️</div>
                <h3 className="text-xl font-bold">Game Paused</h3>
              </div>
            )}
            {hasSubmitted ? (
            <div className="text-center">
              {humanPlayer && Array.isArray(humanPlayer.actions) && humanPlayer.actions.length > 0 && (
                <div className="mb-2 text-left">
                  <h4 className="text-xs font-semibold mb-1.5 text-blue-200">Submitted Actions</h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {humanPlayer.actions.map((a) => (
                      <div key={a.title} className="bg-panel border border-border rounded p-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-text font-medium text-xs">{a.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-panel text-accent border border-border">{a.cost} AP</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <h3 className="text-sm font-bold mb-2">{allAIsDone ? 'Generating next scenario...' : 'Waiting for Opponents...'}</h3>
              {!allAIsDone && (
                <div className="flex flex-wrap gap-2 justify-center mb-2">
                  {aiPlayers.map((player) => {
                    const isComplete = aiCompletionStatus[player.role.name];
                    return (
                      <div
                        key={player.id}
                        className={`flex items-center px-2 py-1 rounded-lg transition-all duration-300 ${
                          isComplete ? 'bg-green-800/50 border border-green-700' : 'bg-gray-700/50'
                        }`}
                      >
                        {isComplete ? <CheckCircleIcon className="h-4 w-4 text-green-400 mr-1.5" /> : <LoadingSpinner />}
                        <span className={`text-xs ${isComplete ? 'text-gray-300' : 'text-gray-400'}`}>{player.role.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {allAIsDone && (
                <div className="flex flex-col items-center mb-2">
                  <LoadingSpinner />
                </div>
              )}
              <p className="text-[10px] text-muted italic text-center">
                "{joke}"
              </p>
            </div>
          ) : (
            <>
              {isLoading && !actionOptions.length ? (
                <div className="flex flex-col justify-center items-center h-24">
                  <LoadingSpinner />
                  <p className="mt-2 text-[10px] text-gray-400 italic text-center">
                    "{joke}"
                  </p>
                </div>
              ) : (
                <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                  {actionOptions.map((opt) => {
                    const isSelected = selected.some((s) => s.title === opt.title);
                    const canSelect = (pointsUsed + opt.cost <= availablePoints) || isSelected;
                    const isExpanded = expandedActions.has(opt.title);
                    return (
                      <div
                        key={opt.title}
                        className={`w-full text-left p-1.5 rounded-md border transition-colors ${
                          isSelected
                            ? 'border-accent bg-[var(--accent-soft)] shadow-inner'
                            : canSelect
                            ? 'border-border bg-panel'
                            : 'border-border bg-panel text-muted opacity-60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleAction(opt)}
                          disabled={!canSelect && !isSelected}
                          className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className={`font-semibold ${fontSizes.body} break-words flex-1 text-text`}>
                              {opt.title}
                              <span className={`ml-1.5 inline-flex items-center ${fontSizes.caption} font-semibold bg-panel text-accent border border-border px-1.5 py-0.5 rounded-full`}>{opt.cost} AP</span>
                            </p>
                            {isSelected && <span className="text-accent text-xs">✓</span>}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleActionExpand(opt.title); }}
                          className="w-full text-left mt-1 focus:outline-none"
                        >
                          <span className={`${fontSizes.caption} text-muted hover:text-accent transition-colors`}>
                            {isExpanded ? '▲ Hide details' : '▼ Show details'}
                          </span>
                        </button>
                        {isExpanded && (
                          <p className={`mt-1 ${fontSizes.body} leading-relaxed text-muted break-words`}>{opt.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  onClick={() => setSelected([])}
                  disabled={selected.length === 0 || confirmDisabled}
                  variant="outline"
                  className="h-9 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Clear selected actions"
                >
                  Reset
                </Button>

                <Button
                  onClick={() => onConfirmActions(selected)}
                  disabled={confirmDisabled}
                  className="flex-1 h-9 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Confirm Actions
                </Button>
              </div>
            </>
          )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Score Δ (moved below actions) */}
        <div className="bg-panel border border-border rounded-md p-2">
          {collapsedSections.has('scores') ? (
            <button
              onClick={() => toggleSection('scores')}
              className="w-full flex items-center gap-2 hover:bg-card rounded p-1 transition-colors"
              aria-label="Expand Score Δ"
            >
              <span className="text-accent text-sm">+</span>
              <p className="text-sm uppercase tracking-wide text-accent font-semibold">Score Δ</p>
            </button>
          ) : (
            <div className="flex gap-2">
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <button
                  onClick={() => toggleSection('scores')}
                  className="p-1 hover:bg-card rounded transition-colors"
                  aria-label="Collapse Score Δ"
                >
                  <span className="text-accent text-xs">−</span>
                </button>
                <p className="text-xs uppercase tracking-wide text-accent font-semibold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Score Δ</p>
              </div>
              <div className="flex-1 min-w-0">
            {hasLastRound && playerActions.length > 0 ? (
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {playerActions.map((playerAction) => {
                  const hiddenUpdate = hiddenScoreChanges[playerAction.roleName];
                  const matchingPlayer = players.find((p) => p.role.name === playerAction.roleName);
                  return (
                    <div key={`action_${playerAction.roleName}`} className="bg-panel border border-border rounded p-2">
                      <div className="mb-1">
                        <div className="flex items-start justify-between gap-1 mb-0.5">
                          <span className="font-semibold text-text text-xs break-words">{playerAction.roleName}</span>
                          {hiddenUpdate && (
                            <span className={`text-xs font-bold flex-shrink-0 ${hiddenUpdate.update >= 0 ? 'text-success' : 'text-danger'}`}>
                              {hiddenUpdate.update >= 0 ? '+' : ''}{hiddenUpdate.update}
                            </span>
                          )}
                        </div>
                        {matchingPlayer?.isHuman && (
                          <span className="text-[10px] text-muted italic block break-words">
                            {matchingPlayer.role.hiddenObjective}
                          </span>
                        )}
                      </div>
                      <ul className="space-y-0.5 mt-1">
                        {playerAction.actions.length > 0 ? (
                          playerAction.actions.map((action, idx) => (
                            <li key={idx} className="flex justify-between items-start gap-1 text-[11px]">
                              <span className="leading-tight flex-1 text-muted break-words">{action.title}</span>
                              <span className="flex-shrink-0 text-[10px] font-semibold text-accent">{action.cost}AP</span>
                            </li>
                          ))
                        ) : (
                          <li className="italic text-muted text-[11px]">No action</li>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-panel border border-border rounded-md p-3">
                <p className="text-xs text-muted leading-relaxed">Actions and score Δ will appear here after the first round.</p>
              </div>
            )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
