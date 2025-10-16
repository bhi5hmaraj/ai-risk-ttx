import React, { useState } from 'react';
import { useGameController } from './hooks/useGameController';
import { ActionTreePortal, FeedbackBanner, FeedbackModal, MakePublicModal } from './components/game';
import { Navigation } from './components/Navigation';
import { LobbyScreen, GameScreen, EndScreen, LoadingScreen, AboutScreen, UpdatesScreen } from './screens';
import { GamePhase } from './types';
import type { GameMetadata } from './types/feedback';

export default function App() {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAboutScreen, setShowAboutScreen] = useState(false);
  const [showUpdatesScreen, setShowUpdatesScreen] = useState(false);
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
      logEntry={latestLogEntry}
      eventLog={gameState.eventLog}
    />
  );

  const isInGame = gameState.phase !== GamePhase.LOBBY;

  // Show About screen if requested
  if (showAboutScreen) {
    return (
      <>
        <Navigation
          onNavigateHome={() => setShowAboutScreen(false)}
          onOpenFeedback={() => setShowFeedbackModal(true)}
          onOpenAbout={() => setShowAboutScreen(true)}
          onOpenUpdates={() => setShowUpdatesScreen(true)}
          showFeedback={false}
        />
        <AboutScreen onBack={() => setShowAboutScreen(false)} />
      </>
    );
  }

  // Show Updates screen if requested
  if (showUpdatesScreen) {
    return (
      <>
        <Navigation
          onNavigateHome={() => setShowUpdatesScreen(false)}
          onOpenFeedback={() => setShowFeedbackModal(true)}
          onOpenAbout={() => setShowAboutScreen(true)}
          onOpenUpdates={() => setShowUpdatesScreen(true)}
          showFeedback={false}
        />
        <UpdatesScreen onBack={() => setShowUpdatesScreen(false)} />
      </>
    );
  }

  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <>
        <Navigation
          onNavigateHome={resetState}
          onOpenFeedback={() => setShowFeedbackModal(true)}
          onOpenAbout={() => setShowAboutScreen(true)}
          onOpenUpdates={() => setShowUpdatesScreen(true)}
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
  }

  if (isLoading && gameState.phase !== GamePhase.ACTION) {
    return (
      <>
        <Navigation
          onNavigateHome={resetState}
          onOpenFeedback={() => setShowFeedbackModal(true)}
          onOpenAbout={() => setShowAboutScreen(true)}
          onOpenUpdates={() => setShowUpdatesScreen(true)}
          showFeedback={isInGame}
        />
        {actionTree}
        <LoadingScreen message={loadingMessage} error={error} />
      </>
    );
  }

  if (gameState.phase === GamePhase.END) {
    return (
      <>
        <Navigation
          onNavigateHome={resetState}
          onOpenFeedback={() => setShowFeedbackModal(true)}
          onOpenAbout={() => setShowAboutScreen(true)}
          onOpenUpdates={() => setShowUpdatesScreen(true)}
          showFeedback={isInGame}
        />
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          gameMetadata={gameMetadata}
        />
        {actionTree}
        <EndScreen gameState={gameState} players={players} onReset={resetState} />
      </>
    );
  }

  if (humanPlayer) {
    return (
      <>
        <Navigation
          onNavigateHome={resetState}
          onOpenFeedback={() => setShowFeedbackModal(true)}
          onOpenAbout={() => setShowAboutScreen(true)}
          onOpenUpdates={() => setShowUpdatesScreen(true)}
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
    );
  }

  return (
    <>
      {actionTree}
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <p className="text-red-500 text-2xl font-bold mb-4">{error || 'An unexpected error occurred.'}</p>
        <button onClick={resetState} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">
          Back to Home
        </button>
      </div>
    </>
  );
}
