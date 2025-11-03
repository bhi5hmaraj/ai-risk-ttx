'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { FeedbackBanner, FeedbackModal, MakePublicModal, ActionTreePortal } from '@/components/game';
import { GameScreen, LoadingScreen } from '@/screens';
import { useGameController } from '@/hooks/useGameController';
import { GamePhase } from '@/types';
import type { GameMetadata } from '@/types/feedback';

export default function GamePage() {
  const router = useRouter();
  const {
    state: {
      gameState,
      players,
      timer,
      isPaused,
      isLoading,
      loadingMessage,
      error,
      actionOptions,
      aiCompletionStatus,
      isActionTreeOpen,
      isHistoryOpen,
      expandedRound,
      latestLogEntry,
      selectedLogEntry,
      canViewActionTree,
      gameSetup,
      customScenario,
      gamePath,
    },
    actions: {
      handleConfirmActions,
      handleToggleHistory,
      handleOpenActionTree,
      setExpandedRound,
      setIsActionTreeOpen,
      resetState,
    },
    derived: { humanPlayer, handlePauseToggle },
  } = useGameController();

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showMakePublicModal, setShowMakePublicModal] = useState(false);
  const [scenarioSubmitted, setScenarioSubmitted] = useState(false);

  // Routing decisions handled by RouteOrchestrator. Keep UI fallbacks only.

  const humanReady = Boolean(humanPlayer);

  // Avoid covering the screen during action-options fetches; show inline spinner instead.
  const suppressOverlayForOptions = (loadingMessage || '').toLowerCase().includes('action option');
  const showLoadingOverlay =
    ((isLoading && gameState.phase !== GamePhase.ACTION && !suppressOverlayForOptions) || !humanReady);
  const showMakePublic =
    !!gameSetup &&
    gameState.phase === GamePhase.ACTION &&
    gamePath === 'custom' &&
    !!customScenario &&
    !scenarioSubmitted;

  const gameMetadata: GameMetadata = useMemo(
    () => ({
      model: process.env.NEXT_PUBLIC_LLM_MODEL || process.env.VITE_LLM_MODEL || 'unknown',
      scenarioType:
        gamePath === 'ai_safety' ? 'ai_safety' : gamePath === 'custom' ? 'custom' : 'classic',
      rolePlayed: humanPlayer?.role.name || 'Unknown',
      roundsCompleted: gameState.round,
      finalPublicScore: gameState.phase === GamePhase.END ? gameState.coreMetric.value : null,
      customPromptUsed: gamePath === 'custom' && !!customScenario,
      customPrompt: gamePath === 'custom' ? customScenario ?? '' : undefined,
    }),
    [gamePath, customScenario, humanPlayer?.role.name, gameState.round, gameState.phase, gameState.coreMetric.value]
  );

  const actionTree = (
    <ActionTreePortal
      isOpen={isActionTreeOpen}
      onClose={() => setIsActionTreeOpen(false)}
      logEntry={selectedLogEntry}
      eventLog={gameState.eventLog}
    />
  );

  return (
    <>
      <Navigation
        onNavigateHome={() => {
          resetState();
          router.push('/');
        }}
        onOpenFeedback={() => setShowFeedbackModal(true)}
        onOpenAbout={() => router.push('/about')}
        onOpenUpdates={() => router.push('/updates')}
        showFeedback
      />
      {actionTree}
      {showLoadingOverlay ? (
        <LoadingScreen
          message={humanReady ? loadingMessage : 'Preparing your role...'}
          error={error}
        />
      ) : (
        <>
          <FeedbackBanner currentRound={gameState.round} onOpenFeedback={() => setShowFeedbackModal(true)} />
          <FeedbackModal
            isOpen={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
            gameMetadata={gameMetadata}
          />
          {showMakePublic && (
            <MakePublicModal
              isOpen={showMakePublicModal}
              onClose={() => setShowMakePublicModal(false)}
              customPrompt={customScenario ?? ''}
              gameSetup={gameSetup!}
              initialEvent={{
                headline: gameSetup!.scenarioTitle,
                detail: gameSetup!.scenarioDescription,
              }}
              onSubmitSuccess={() => {
                setScenarioSubmitted(true);
                setShowMakePublicModal(false);
              }}
            />
          )}
          <GameScreen
            gameState={gameState}
            players={players}
            humanPlayer={humanPlayer!}
            timer={timer}
            isPaused={isPaused}
            isLoading={isLoading}
            actionOptions={actionOptions}
            aiCompletionStatus={aiCompletionStatus}
            isHistoryOpen={isHistoryOpen}
            expandedRound={expandedRound}
            latestLogEntry={latestLogEntry}
            canViewActionTree={canViewActionTree}
            onToggleHistory={handleToggleHistory}
            onOpenActionTree={handleOpenActionTree}
            onConfirmActions={handleConfirmActions}
            onSetExpandedRound={setExpandedRound}
            onPauseToggle={handlePauseToggle}
            error={error}
            isCustomScenario={showMakePublic}
            onMakePublic={() => setShowMakePublicModal(true)}
            onOpenFeedback={() => setShowFeedbackModal(true)}
          />
        </>
      )}
    </>
  );
}
