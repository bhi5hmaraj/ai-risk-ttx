"use client";

import React from 'react';
import type { ActionOption, GameLogEntry, GameState, Player } from '../types';
import { RoundSnapshotCard, EventLog, ActionSelection, StatusBar } from '../components/game';
import { useUIStore } from '../stores/uiStore';

interface GameScreenProps {
  gameState: GameState;
  players: Player[];
  humanPlayer: Player;
  timer: number;
  isPaused: boolean;
  isLoading: boolean;
  actionOptions: ActionOption[];
  aiCompletionStatus: Record<string, boolean>;
  isHistoryOpen: boolean;
  expandedRound: number | null;
  latestLogEntry: GameLogEntry | null;
  canViewActionTree: boolean;
  onToggleHistory: () => void;
  onOpenActionTree: () => void;
  onConfirmActions: (actions: ActionOption[]) => void;
  onSetExpandedRound: (round: number | null) => void;
  onPauseToggle: () => void;
  error: string | null;
  isCustomScenario?: boolean;
  onMakePublic?: () => void;
  onOpenFeedback?: () => void;
  maxRounds?: number;
  scenarioAlreadyPublic?: boolean;
}

const GameScreen: React.FC<GameScreenProps> = ({
  gameState,
  players,
  humanPlayer,
  timer,
  isPaused,
  isLoading,
  actionOptions,
  aiCompletionStatus,
  isHistoryOpen,
  expandedRound,
  latestLogEntry,
  canViewActionTree,
  onToggleHistory,
  onOpenActionTree,
  onConfirmActions,
  onSetExpandedRound,
  onPauseToggle,
  error,
  isCustomScenario,
  onMakePublic,
  onOpenFeedback,
  maxRounds,
  scenarioAlreadyPublic,
}) => {
  const { isHistoryOpen: historyOpen } = useUIStore();

  return (
  <div className="min-h-screen bg-bg px-2 pb-2 md:px-3 md:pb-3 lg:px-4 lg:pb-4 pt-12">
    <div className="max-w-[1920px] mx-auto">
      <StatusBar
        gameState={gameState}
        timer={timer}
        isPaused={isPaused}
        onPauseClick={onPauseToggle}
        player={humanPlayer}
        maxRounds={maxRounds}
        onOpenActionTree={onOpenActionTree}
        canViewActionTree={canViewActionTree}
        onOpenFeedback={onOpenFeedback}
        onMakePublic={onMakePublic}
        showMakePublic={isCustomScenario}
        scenarioAlreadyPublic={scenarioAlreadyPublic}
        availablePoints={humanPlayer.actionPoints}
        latestLogEntry={latestLogEntry}
      />
      {error && (
        <div className="bg-red-800/50 border border-red-500 text-red-300 p-4 rounded-lg mb-4 text-center">{error}</div>
      )}
      <RoundSnapshotCard
        gameState={gameState}
        latestLogEntry={latestLogEntry}
        players={players}
        actionOptions={actionOptions}
        onConfirmActions={onConfirmActions}
        isLoading={isLoading && !humanPlayer.hasSubmittedActions}
        hasSubmitted={humanPlayer.hasSubmittedActions}
        isPaused={isPaused}
        aiCompletionStatus={aiCompletionStatus}
        availablePoints={humanPlayer.actionPoints}
        humanPlayer={humanPlayer}
      />
      {historyOpen && (
        <div className="mt-6" data-testid="event-log">
          <EventLog
            gameState={gameState}
            players={players}
            onViewActionTree={onOpenActionTree}
            canViewActionTree={canViewActionTree}
            expandedRound={expandedRound}
            setExpandedRound={onSetExpandedRound}
          />
        </div>
      )}
    </div>
  </div>
  );
};

export { GameScreen };
