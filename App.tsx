import React from 'react';
import { useGameController } from './hooks/useGameController';
import { ActionTreePortal } from './components/game';
import { LobbyScreen, GameScreen, EndScreen, LoadingScreen } from './screens';
import { GamePhase } from './types';

export default function App() {
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

  const actionTree = (
    <ActionTreePortal
      isOpen={isActionTreeOpen}
      onClose={() => setIsActionTreeOpen(false)}
      logEntry={latestLogEntry}
      eventLog={gameState.eventLog}
    />
  );

  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <>
        {actionTree}
        <LobbyScreen
          selectedRoleName={selectedRoleName}
          setSelectedRoleName={setSelectedRoleName}
          gamePath={gamePath}
          setGamePath={setGamePath}
          customScenario={customScenario}
          setCustomScenario={setCustomScenario}
          gameSetup={gameSetup}
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
        {actionTree}
        <LoadingScreen message={loadingMessage} error={error} />
      </>
    );
  }

  if (gameState.phase === GamePhase.END) {
    return (
      <>
        {actionTree}
        <EndScreen gameState={gameState} players={players} onReset={resetState} />
      </>
    );
  }

  if (humanPlayer) {
    return (
      <>
        {actionTree}
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
