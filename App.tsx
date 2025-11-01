import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useGameController } from './hooks/useGameController';
import { ActionTreePortal, FeedbackBanner, FeedbackModal, MakePublicModal } from './components/game';
import { Navigation } from './components/Navigation';
import {
  LobbyScreen,
  GameScreen,
  EndScreen,
  LoadingScreen,
  AboutScreen,
  UpdatesScreen,
  GameRulesScreen
} from './screens';
import { GamePhase } from './types';
import type { GameMetadata } from './types/feedback';

// Wrapper component for game routes that need game controller
function GameController() {
  const navigate = useNavigate();
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

  // Reset scenarioSubmitted when returning to lobby or creating new scenario
  React.useEffect(() => {
    if (gameState.phase === GamePhase.LOBBY) {
      setScenarioSubmitted(false);
    }
  }, [gameState.phase]);

  // Navigate to game when game starts
  React.useEffect(() => {
    if (gameState.phase === GamePhase.STARTING ||
        gameState.phase === GamePhase.ACTION ||
        gameState.phase === GamePhase.CONSEQUENCE) {
      navigate('/game');
    } else if (gameState.phase === GamePhase.END) {
      navigate('/end');
    }
  }, [gameState.phase, navigate]);

  // Build game metadata for feedback form
  const gameMetadata: GameMetadata = {
    model: import.meta.env.VITE_LLM_MODEL || 'unknown',
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
    navigate('/');
  };

  return (
    <Routes>
      {/* Home/Rules Screen */}
      <Route
        path="/"
        element={
          <>
            <Navigation
              onNavigateHome={handleResetAndNavigate}
              onOpenFeedback={() => setShowFeedbackModal(true)}
              onOpenAbout={() => navigate('/about')}
              onOpenUpdates={() => navigate('/updates')}
              showFeedback={false}
            />
            <GameRulesScreen onNavigateToLobby={() => navigate('/lobby')} />
          </>
        }
      />

      {/* About Screen */}
      <Route
        path="/about"
        element={
          <>
            <Navigation
              onNavigateHome={() => navigate('/')}
              onOpenFeedback={() => setShowFeedbackModal(true)}
              onOpenAbout={() => navigate('/about')}
              onOpenUpdates={() => navigate('/updates')}
              showFeedback={false}
            />
            <AboutScreen onBack={() => navigate('/')} />
          </>
        }
      />

      {/* Updates Screen */}
      <Route
        path="/updates"
        element={
          <>
            <Navigation
              onNavigateHome={() => navigate('/')}
              onOpenFeedback={() => setShowFeedbackModal(true)}
              onOpenAbout={() => navigate('/about')}
              onOpenUpdates={() => navigate('/updates')}
              showFeedback={false}
            />
            <UpdatesScreen onBack={() => navigate('/')} />
          </>
        }
      />

      {/* Lobby Screen */}
      <Route
        path="/lobby"
        element={
          <>
            <Navigation
              onNavigateHome={handleResetAndNavigate}
              onOpenFeedback={() => setShowFeedbackModal(true)}
              onOpenAbout={() => navigate('/about')}
              onOpenUpdates={() => navigate('/updates')}
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
        }
      />

      {/* Loading Screen */}
      <Route
        path="/loading"
        element={
          isLoading && gameState.phase !== GamePhase.ACTION ? (
            <>
              <Navigation
                onNavigateHome={handleResetAndNavigate}
                onOpenFeedback={() => setShowFeedbackModal(true)}
                onOpenAbout={() => navigate('/about')}
                onOpenUpdates={() => navigate('/updates')}
                showFeedback={isInGame}
              />
              {actionTree}
              <LoadingScreen message={loadingMessage} error={error} />
            </>
          ) : (
            <Navigate to="/lobby" replace />
          )
        }
      />

      {/* Game Screen */}
      <Route
        path="/game"
        element={
          humanPlayer ? (
            <>
              <Navigation
                onNavigateHome={handleResetAndNavigate}
                onOpenFeedback={() => setShowFeedbackModal(true)}
                onOpenAbout={() => navigate('/about')}
                onOpenUpdates={() => navigate('/updates')}
                showFeedback={isInGame}
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
              />
            </>
          ) : (
            <Navigate to="/lobby" replace />
          )
        }
      />

      {/* End Screen */}
      <Route
        path="/end"
        element={
          gameState.phase === GamePhase.END ? (
            <>
              <Navigation
                onNavigateHome={handleResetAndNavigate}
                onOpenFeedback={() => setShowFeedbackModal(true)}
                onOpenAbout={() => navigate('/about')}
                onOpenUpdates={() => navigate('/updates')}
                showFeedback={isInGame}
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
              />
            </>
          ) : (
            <Navigate to="/lobby" replace />
          )
        }
      />

      {/* Catch-all redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <GameController />;
}
