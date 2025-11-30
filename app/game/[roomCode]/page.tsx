'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { logger } from '@/lib/clientLogger';
import { Navigation } from '@/components/Navigation';
import { ConnectionStatusPill } from '@/components/ConnectionStatus';
import { FeedbackBanner, FeedbackModal, MakePublicModal, ActionTreePortal, WaitingRoom, RoleSelector } from '@/components/game';
import { GameScreen, LoadingScreen } from '@/screens';
import { useGame } from '@/hooks/useGame';
import { useUI } from '@/hooks/useUI';
import { useActions } from '@/hooks/useActions';
import { useLobby } from '@/hooks/useLobby';
import { useGameActionsColyseus as useGameActions } from '@/hooks/useGameActionsColyseus';
import { useColyseus } from '@/providers/ColyseusProvider';
import { useRoundOptions } from '@/hooks/useRoundOptions';
import { GAME_CONFIG } from '@/gameConfig';
import { GamePhase } from '@/types';
import { useTimer } from '@/hooks/useTimer';
import type { GameMetadata } from '@/types/feedback';

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const roomCode = params?.roomCode as string;
  const { gameState, players } = useGame();
  const { isConnected, state: colyseusState, connect: colyseusConnect, isConnecting, sessionId } = useColyseus();
  const { availableRoles } = useLobby();
  const { isLoading, loadingMessage, error, setHistoryOpen } = useUI();
  const { actionOptions, aiCompletionStatus, isGeneratingOptions } = useActions();
  const { gameSetup, customScenario, gamePath, isFromPublicCatalog } = useLobby();
  const { handleConfirmActions, selectRole } = useGameActions();
  const { loadHumanOptions } = useRoundOptions();
  const [isActionTreeOpen, setIsActionTreeOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  // Keep UI store in sync when toggling history from GameScreen
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  // Find current player by sessionId (not just isHuman, since multiplayer has multiple human players)
  const humanPlayer = useMemo(() => {
    if (!sessionId) return players.find((p) => p.isHuman) || null;
    return players.find((p) => (p as any).id === sessionId) || null;
  }, [players, sessionId]);
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

  // Show loading overlay when:
  // 1. Generating action options from server (Colyseus flow)
  // 2. Loading during non-ACTION phases
  // 3. Human player not ready yet
  const showLoadingOverlay =
    isGeneratingOptions ||
    (isLoading && gameState.phase !== GamePhase.ACTION) ||
    !humanReady;
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

  // Role selection state for joining game
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null);
  const [playerName, setPlayerName] = React.useState<string>('');

  // Filter available roles to exclude those already taken by human players
  const availableUntakenRoles = useMemo(() => {
    if (!availableRoles.length) return [];

    // Get roles already taken by human players
    const takenRoleNames = players
      .filter(p => p.isHuman)
      .map(p => p.role.name);

    // Return only untaken roles
    return availableRoles.filter(role => !takenRoleNames.includes(role.name));
  }, [availableRoles, players]);

  // Check if current player has selected a role
  const hasSelectedRole = useMemo(() => {
    if (!sessionId || !players || players.length === 0) return false;
    const currentPlayer = players.find(p => (p as any).id === sessionId);
    return Boolean(currentPlayer?.role?.name);
  }, [sessionId, players]);

  // SPA flow: if a guest lands directly on /game/:code via a shared link,
  // auto-connect to the room without a role so we can receive players_init
  // and show the role selector.
  const autoConnectDoneRef = React.useRef(false);
  useEffect(() => {
    if (autoConnectDoneRef.current) return;
    if (!isConnected && !isConnecting && roomCode) {
      autoConnectDoneRef.current = true;
      colyseusConnect({ name: 'Guest', role: '', isHuman: true, gameId: roomCode }).catch(() => {
        autoConnectDoneRef.current = false; // allow retry if it failed
      });
    }
  }, [isConnected, isConnecting, roomCode, colyseusConnect]);

  // Handle role selection
  const handleConfirmRole = React.useCallback(async () => {
    if (!selectedRole || !playerName.trim()) return;

    console.log('[GamePage] Setting role:', selectedRole, 'name:', playerName);

    if (!isConnected) return; // wait until auto-connect finishes
    // Update role on server
    selectRole(selectedRole, playerName.trim());
  }, [selectedRole, playerName, roomCode, isConnected, colyseusConnect, selectRole]);

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

  // Convert availableRoles (RoleData with React component icons) to simple Role format for RoleSelector
  const rolesToShow = React.useMemo(() => {
    logger.info('[GamePage] rolesToShow recalculating', {
      hasGameSetup: !!gameSetup,
      availableRolesCount: availableRoles.length,
      availableRoles: availableRoles.map(r => r.name),
    });

    // First try gameSetup stakeholders (first player from lobby)
    if (gameSetup?.stakeholders) {
      const takenByName = new Map(availableRoles.map(r => [r.name, Boolean((r as any).taken)]));
      return gameSetup.stakeholders
        .filter(s => s.name && s.name.trim())
        .map((stakeholder) => ({
          name: stakeholder.name,
          description: stakeholder.publicObjective || '',
          icon: stakeholder.icon || '👤',
          isTaken: takenByName.get(stakeholder.name) || false,
        }));
    }
    // Fallback to availableRoles from server (second player joining via URL)
    return availableRoles
      .filter(role => role.name && role.name.trim()) // Filter out empty names
      .map(role => ({
        name: role.name,
        description: role.publicObjective || '',
        icon: '👤',
        isTaken: Boolean((role as any).taken),
      }));
  }, [gameSetup, availableRoles]);

  // Do not request roles manually; server pushes players_init and provider/hook hydrate lobbyStore.

  // Phase-based rendering (lobby-first guard)
  if (!colyseusState || colyseusState?.phase === 'lobby') {
    // While connecting, show loading
    if (!isConnected) {
      return (
        <LoadingScreen
          message={isConnecting ? 'Joining game...' : 'Connecting...'}
          error={error}
        />
      );
    }

    // No role yet → RoleSelector (even if roles are not yet loaded)
    if (!hasSelectedRole) {
      return (
        <>
          <Navigation
            onNavigateHome={() => {
              router.push('/');
            }}
            onOpenFeedback={() => {}}
            onOpenAbout={() => router.push('/about')}
            onOpenUpdates={() => router.push('/updates')}
            showFeedback={false}
            autoCollapse
          />
          <div className="fixed top-4 right-4 z-50">
            <ConnectionStatusPill />
          </div>
          {rolesToShow.length === 0 && (
            <div className="text-center text-gray-400 mb-4">Waiting for available roles from host...</div>
          )}
          <RoleSelector
            availableRoles={rolesToShow}
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            playerName={playerName}
            onNameChange={setPlayerName}
            onConfirm={handleConfirmRole}
            disabled={!isConnected || isConnecting}
          />
        </>
      );
    }

    // Role selected → WaitingRoom
    return (
      <>
        <Navigation
          onNavigateHome={() => {
            router.push('/');
          }}
          onOpenFeedback={() => {}}
          onOpenAbout={() => router.push('/about')}
          onOpenUpdates={() => router.push('/updates')}
          showFeedback={false}
          autoCollapse
        />
        <div className="fixed top-4 right-4 z-50">
          <ConnectionStatusPill />
        </div>
        <WaitingRoom />
      </>
    );
  }

  // Active game rendering (ACTION, CONSEQUENCE, END phases)
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
          message={
            isGeneratingOptions
              ? 'Generating action options...'
              : humanReady
              ? loadingMessage
              : 'Preparing your role...'
          }
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
            // Disable confirm until options arrive in ACTION phase
            isLoading={isGeneratingOptions || (gameState.phase === GamePhase.ACTION && actionOptions.length === 0)}
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
            maxRounds={gameState.maxRounds ?? gameSetup?.maxRounds ?? undefined}
            scenarioAlreadyPublic={scenarioSubmitted || isFromPublicCatalog}
          />
        </>
      )}
    </>
  );
}
  // SPA flow: do not redirect to /lobby; guests should use the Lobby to join by code,
  // and shared links now point directly to /game/:code.
