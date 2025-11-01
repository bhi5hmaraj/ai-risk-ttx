'use client';

import React, { useState, useEffect } from 'react';
import { useGameController } from '../hooks/useGameController';
import { ActionTreePortal, FeedbackBanner, FeedbackModal, MakePublicModal } from '../components/game';
import { Navigation } from '../components/Navigation';
import {
  LobbyScreen,
  GameScreen,
  EndScreen,
  LoadingScreen,
  GameRulesScreen,
  AboutScreen,
  UpdatesScreen,
} from '../screens';
import { GamePhase } from '../types';
import type { GameMetadata } from '../types/feedback';

type ScreenType = 'home' | 'lobby' | 'game' | 'end' | 'about' | 'updates';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showMakePublicModal, setShowMakePublicModal] = useState(false);
  const [scenarioSubmitted, setScenarioSubmitted] = useState(false);

  const {
    state: {
      gameState,
      players,
      selectedRoleName,
      gamePath,
      gameSetup,
      customScenario,
      isLoading,
      loadingMessage,
      error,
      timer,
      isPaused,
      actionOptions,
      aiCompletionStatus,
      isActionTreeOpen,
      isHistoryOpen,
      expandedRound,
      latestLogEntry,
      selectedLogEntry,
      canViewActionTree,
    },
    actions: {
      setSelectedRoleName,
      setGamePath,
      setGameSetup,
      setCustomScenario,
      setExpandedRound,
      setIsActionTreeOpen,
      handleCustomGameStart,
      handleStartGame,
      handleConfirmActions,
      resetState,
      handleOpenActionTree,
      handleToggleHistory,
    },
    derived: { humanPlayer, handlePauseToggle },
  } = useGameController();

  // Reset scenarioSubmitted when returning to lobby
  useEffect(() => {
    if (gameState.phase === GamePhase.LOBBY) {
      setScenarioSubmitted(false);
    }
  }, [gameState.phase]);

  // Navigate to game when game starts
  useEffect(() => {
    if (gameState.phase === GamePhase.STARTING ||
        gameState.phase === GamePhase.ACTION ||
        gameState.phase === GamePhase.CONSEQUENCE) {
      setCurrentScreen('game');
    } else if (gameState.phase === GamePhase.END) {
      setCurrentScreen('end');
    }
  }, [gameState.phase]);

  // Build game metadata for feedback form
  const gameMetadata: GameMetadata = {
    model: process.env.NEXT_PUBLIC_LLM_MODEL || process.env.VITE_LLM_MODEL || 'unknown',
    scenarioType: gamePath === 'ai_safety' ? 'ai_safety' : gamePath === 'custom' ? 'custom' : 'classic',
    rolePlayed: humanPlayer?.role.name || 'Unknown',
    roundsCompleted: gameState.round,
    finalPublicScore: gameState.phase === GamePhase.END ? gameState.coreMetric.value : null,
    customPromptUsed: gamePath === 'custom' && !!customScenario,
    customPrompt: gamePath === 'custom' ? customScenario : undefined,
  };

  const actionTree = (
    <ActionTreePortal
      isOpen={isActionTreeOpen}
      onClose={() => setIsActionTreeOpen(false)}
      logEntry={selectedLogEntry}
      eventLog={gameState.eventLog}
    />
  );

  const isInGame = gameState.phase !== GamePhase.LOBBY;

  const handleResetAndNavigate = () => {
    resetState();
    setCurrentScreen('home');
  };

  const handleNavigateHome = () => {
    setCurrentScreen('home');
  };

  const handleNavigateLobby = () => {
    setCurrentScreen('lobby');
  };

  const handleNavigateAbout = () => {
    setCurrentScreen('about');
  };

  const handleNavigateUpdates = () => {
    setCurrentScreen('updates');
  };

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <>
            <Navigation
              onNavigateHome={handleResetAndNavigate}
              onOpenFeedback={() => setShowFeedbackModal(true)}
              onOpenAbout={handleNavigateAbout}
              onOpenUpdates={handleNavigateUpdates}
              showFeedback={false}
            />
            <GameRulesScreen onNavigateToLobby={handleNavigateLobby} />
          </>
        );

      case 'lobby':
        return (
          <>
            <Navigation
              onNavigateHome={handleResetAndNavigate}
              onOpenFeedback={() => setShowFeedbackModal(true)}
              onOpenAbout={handleNavigateAbout}
              onOpenUpdates={handleNavigateUpdates}
              showFeedback={false}
            />
            {actionTree}
            <LobbyScreen
              selectedRoleName={selectedRoleName}
              setSelectedRoleName={setSelectedRoleName}
              gamePath={gamePath}
              setGamePath={setGamePath}
              customScenario={customScenario}
              setCustomScenario={setCustomScenario}
              gameSetup={gameSetup}
              setGameSetup={setGameSetup}
              isLoading={isLoading}
              handleCustomGameStart={handleCustomGameStart}
              handleStartGame={handleStartGame}
            />
          </>
        );

      case 'game':
        if (!humanPlayer) {
          setCurrentScreen('lobby');
          return null;
        }

        if (isLoading && gameState.phase !== GamePhase.ACTION) {
          return (
            <>
              <Navigation
                onNavigateHome={handleResetAndNavigate}
                onOpenFeedback={() => setShowFeedbackModal(true)}
                onOpenAbout={handleNavigateAbout}
                onOpenUpdates={handleNavigateUpdates}
                showFeedback={false}
              />
              {actionTree}
              <LoadingScreen message={loadingMessage} error={error} />
            </>
          );
        }

        return (
          <>
            <Navigation
              onNavigateHome={handleResetAndNavigate}
              onOpenFeedback={() => setShowFeedbackModal(true)}
              onOpenAbout={handleNavigateAbout}
              onOpenUpdates={handleNavigateUpdates}
              showFeedback={false}
            />
            {actionTree}
            <FeedbackBanner
              currentRound={gameState.round}
              onOpenFeedback={() => setShowFeedbackModal(true)}
            />
            <FeedbackModal
              isOpen={showFeedbackModal}
              onClose={() => setShowFeedbackModal(false)}
              gameMetadata={gameMetadata}
            />
            {gamePath === 'custom' && gameSetup && (
              <MakePublicModal
                isOpen={showMakePublicModal}
                onClose={() => setShowMakePublicModal(false)}
                customPrompt={customScenario}
                gameSetup={gameSetup}
                initialEvent={{
                  headline: gameSetup.scenarioTitle,
                  detail: gameSetup.scenarioDescription,
                }}
                onSubmitSuccess={() => setScenarioSubmitted(true)}
              />
            )}
            <GameScreen
              gameState={gameState}
              players={players}
              humanPlayer={humanPlayer}
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
              isCustomScenario={gamePath === 'custom' && !!customScenario && !scenarioSubmitted}
              onMakePublic={() => setShowMakePublicModal(true)}
              onOpenFeedback={() => setShowFeedbackModal(true)}
            />
          </>
        );

      case 'end':
        if (gameState.phase !== GamePhase.END) {
          setCurrentScreen('lobby');
          return null;
        }

        return (
          <>
            <Navigation
              onNavigateHome={handleResetAndNavigate}
              onOpenFeedback={() => setShowFeedbackModal(true)}
              onOpenAbout={handleNavigateAbout}
              onOpenUpdates={handleNavigateUpdates}
              showFeedback={false}
            />
            <FeedbackModal
              isOpen={showFeedbackModal}
              onClose={() => setShowFeedbackModal(false)}
              gameMetadata={gameMetadata}
            />
            {actionTree}
            <EndScreen
              gameState={gameState}
              players={players}
              onReset={handleResetAndNavigate}
              onOpenFeedback={() => setShowFeedbackModal(true)}
              gameSetup={gameSetup}
            />
          </>
        );

      case 'about':
        return (
          <>
            <Navigation
              onNavigateHome={handleNavigateHome}
              onOpenFeedback={() => setShowFeedbackModal(true)}
              onOpenAbout={handleNavigateAbout}
              onOpenUpdates={handleNavigateUpdates}
              showFeedback={false}
            />
            <AboutScreen onBack={handleNavigateHome} />
          </>
        );

      case 'updates':
        return (
          <>
            <Navigation
              onNavigateHome={handleNavigateHome}
              onOpenFeedback={() => setShowFeedbackModal(true)}
              onOpenAbout={handleNavigateAbout}
              onOpenUpdates={handleNavigateUpdates}
              showFeedback={false}
            />
            <UpdatesScreen onBack={handleNavigateHome} />
          </>
        );

      default:
        return null;
    }
  };

  return <>{renderScreen()}</>;
}
