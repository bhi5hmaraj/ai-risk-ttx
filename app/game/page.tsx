'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { FeedbackBanner, FeedbackModal, MakePublicModal, ActionTreePortal } from '@/components/game';
import { GameScreen, LoadingScreen } from '@/screens';
import { useGame } from '@/hooks/useGame';
import { useUI } from '@/hooks/useUI';
import { useActions } from '@/hooks/useActions';
import { useLobby } from '@/hooks/useLobby';
import { useGameActions } from '@/hooks/useGameActions';
import { GamePhase } from '@/types';
import type { GameMetadata } from '@/types/feedback';

export default function GamePage() {
  const router = useRouter();
  const { gameState, players } = useGame();
  const { isLoading, loadingMessage, error, setHistoryOpen } = useUI();
  const { actionOptions, aiCompletionStatus } = useActions();
  const { gameSetup, customScenario, gamePath } = useLobby();
  const { handleConfirmActions } = useGameActions();
  const [isActionTreeOpen, setIsActionTreeOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  // Keep UI store in sync when toggling history from GameScreen
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const humanPlayer = useMemo(() => players.find((p) => p.isHuman) || null, [players]);
  const latestLogEntry = useMemo(
    () => (gameState.eventLog.length > 0 ? gameState.eventLog[gameState.eventLog.length - 1] : null),
    [gameState.eventLog]
  );
  const selectedLogEntry = useMemo(
    () => (expandedRound != null ? gameState.eventLog.find((e) => e.round === expandedRound) ?? latestLogEntry : latestLogEntry),
    [expandedRound, gameState.eventLog, latestLogEntry]
  );
  const canViewActionTree = useMemo(
    () => gameState.eventLog.some((e) => e.playerActions.length > 0),
    [gameState.eventLog]
  );
  const [timer, setTimer] = useState(300);
  const [isPaused, setIsPaused] = useState(false);
  const handlePauseToggle = () => setIsPaused((v) => !v);

  // Minimal timer effect (parity with prior behavior)
  React.useEffect(() => {
    let interval: any;
    if (timer > 0 && gameState.phase === GamePhase.ACTION && !isPaused && !(humanPlayer?.hasSubmittedActions)) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer <= 0 && gameState.phase === GamePhase.ACTION && humanPlayer && !humanPlayer.hasSubmittedActions) {
      handleConfirmActions([]);
    }
    return () => interval && clearInterval(interval);
  }, [timer, gameState.phase, isPaused, humanPlayer, handleConfirmActions]);

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
  const handleOpenActionTree = () => setIsActionTreeOpen(true);
  const handleToggleHistory = () => {
    const next = !isHistoryOpen;
    setIsHistoryOpen(next);
    setHistoryOpen(next);
  };

  return (
    <>
      <Navigation
        onNavigateHome={() => {
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
