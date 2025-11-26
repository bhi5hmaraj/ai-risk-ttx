'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { FeedbackBanner, FeedbackModal, MakePublicModal, ActionTreePortal } from '@/components/game';
import { GameScreen, LoadingScreen } from '@/screens';
import { useGame } from '@/hooks/useGame';
import { useUI } from '@/hooks/useUI';
import { useActions } from '@/hooks/useActions';
import { useLobby } from '@/hooks/useLobby';
import { useGameActions } from '@/hooks/useGameActions';
import { useRoundOptions } from '@/hooks/useRoundOptions';
import { GAME_CONFIG } from '@/gameConfig';
import { GamePhase } from '@/types';
import { useTimer } from '@/hooks/useTimer';
import type { GameMetadata } from '@/types/feedback';

export default function GamePage() {
  const router = useRouter();
  const { gameState, players } = useGame();
  const { isLoading, loadingMessage, error, setHistoryOpen } = useUI();
  const { actionOptions, aiCompletionStatus } = useActions();
  const { gameSetup, customScenario, gamePath, isFromPublicCatalog } = useLobby();
  const { handleConfirmActions } = useGameActions();
  const { loadHumanOptions } = useRoundOptions();
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
  const { timer, isPaused, togglePause: handlePauseToggle, reset } = useTimer({
    phase: gameState.phase,
    humanHasSubmitted: Boolean(humanPlayer?.hasSubmittedActions),
    onTimeout: () => handleConfirmActions([]),
    initial: GAME_CONFIG.ACTION_PHASE_SECONDS,
  });

  // Reset the per-round timer to 5 minutes at the start of each ACTION phase
  const lastRoundRef = useRef<number>(-1);
  useEffect(() => {
    if (gameState.phase === GamePhase.ACTION) {
      if (lastRoundRef.current !== gameState.round) {
        reset(GAME_CONFIG.ACTION_PHASE_SECONDS);
        lastRoundRef.current = gameState.round;
      }
    }
  }, [gameState.phase, gameState.round, reset]);

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
    !isFromPublicCatalog; // Hide Make Public for scenarios from the catalog

  const gameMetadata: GameMetadata = useMemo(
    () => ({
      model: process.env.NEXT_PUBLIC_LLM_MODEL || process.env.VITE_LLM_MODEL || 'unknown',
      scenarioType:
        gamePath === 'ai_safety' ? 'ai_safety' : gamePath === 'custom' ? 'custom' : 'classic',
      scenarioTitle: gameSetup?.scenarioTitle || 'Unknown',
      rolePlayed: humanPlayer?.role.name || 'Unknown',
      roundsCompleted: gameState.round,
      finalPublicScore: gameState.phase === GamePhase.END ? gameState.coreMetric.value : null,
      customPromptUsed: gamePath === 'custom' && !!customScenario,
      customPrompt: gamePath === 'custom' ? customScenario ?? '' : undefined,
    }),
    [gamePath, customScenario, humanPlayer?.role.name, gameState.round, gameState.phase, gameState.coreMetric.value, gameSetup?.scenarioTitle]
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

  // Trigger human action options load when entering ACTION phase and none are present
  // CRITICAL FIX: Removed !isLoading condition to fix race condition
  // The loadHumanOptions function has its own inFlightRef guard to prevent duplicate calls
  // The !isLoading check created timing issues where the SSE event arrived before React re-rendered
  React.useEffect(() => {
    console.log('[GamePage] Action options effect triggered:', {
      phase: gameState.phase,
      hasHumanPlayer: !!humanPlayer,
      hasSubmitted: humanPlayer?.hasSubmittedActions,
      optionsCount: actionOptions.length,
      willLoad: gameState.phase === GamePhase.ACTION && humanPlayer && !humanPlayer.hasSubmittedActions && actionOptions.length === 0
    });

    if (
      gameState.phase === GamePhase.ACTION &&
      humanPlayer &&
      !humanPlayer.hasSubmittedActions &&
      actionOptions.length === 0
    ) {
      console.log('[GamePage] Loading action options for human player');
      loadHumanOptions().catch(() => {});
    }
  }, [gameState.phase, humanPlayer, actionOptions.length, loadHumanOptions]);

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
        autoCollapse
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
            maxRounds={gameSetup?.maxRounds ?? undefined}
            scenarioAlreadyPublic={scenarioSubmitted || isFromPublicCatalog}
          />
        </>
      )}
    </>
  );
}
