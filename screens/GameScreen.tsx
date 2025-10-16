import React from 'react';
import type { ActionOption, GameLogEntry, GameState, Player } from '../types';
import { RoundSnapshotCard, EventLog, ActionSelection, GameStatusPanel } from '../components/game';

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
}

export const GameScreen: React.FC<GameScreenProps> = ({
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
}) => (
  <div className="min-h-screen bg-gray-900 px-4 pb-4 md:px-6 md:pb-6 lg:px-8 lg:pb-8 pt-28">
    <div className="max-w-8xl mx-auto">
      {error && (
        <div className="bg-red-800/50 border border-red-500 text-red-300 p-4 rounded-lg mb-4 text-center">{error}</div>
      )}
      <GameStatusPanel
        gameState={gameState}
        timer={timer}
        isPaused={isPaused}
        onPauseClick={onPauseToggle}
        player={humanPlayer}
        isCustomScenario={isCustomScenario}
        onMakePublic={onMakePublic}
      />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-9 space-y-6">
          <RoundSnapshotCard
            gameState={gameState}
            latestLogEntry={latestLogEntry}
            onToggleHistory={onToggleHistory}
            isHistoryOpen={isHistoryOpen}
            onViewActionTree={onOpenActionTree}
            canViewActionTree={canViewActionTree}
          />
          {isHistoryOpen && (
            <EventLog
              gameState={gameState}
              players={players}
              onViewActionTree={onOpenActionTree}
              canViewActionTree={canViewActionTree}
              expandedRound={expandedRound}
              setExpandedRound={onSetExpandedRound}
            />
          )}
        </div>
        <div className="lg:col-span-3">
          <ActionSelection
            key={gameState.round}
            options={actionOptions}
            onConfirm={onConfirmActions}
            isLoading={isLoading && !humanPlayer.hasSubmittedActions}
            hasSubmitted={humanPlayer.hasSubmittedActions}
            isPaused={isPaused}
            players={players}
            aiCompletionStatus={aiCompletionStatus}
          />
        </div>
      </div>
    </div>
  </div>
);
