'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LobbyScreen } from '@/screens';
import { Navigation } from '@/components/Navigation';
import { ActionTreePortal } from '@/components/game';
import { useGameController } from '@/hooks/useGameController';
import { GamePhase } from '@/types';

export default function LobbyPage() {
  const router = useRouter();
  const {
    state: {
      selectedRoleName,
      gamePath,
      customScenario,
      gameSetup,
      isLoading,
      isActionTreeOpen,
      selectedLogEntry,
      gameState,
    },
    actions: {
      setSelectedRoleName,
      setGamePath,
      setCustomScenario,
      setGameSetup,
      setIsActionTreeOpen,
      handleCustomGameStart,
      handleStartGame,
      resetState,
    },
  } = useGameController();

  // Routing handled by RouteOrchestrator centrally

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
        onOpenFeedback={() => {}}
        onOpenAbout={() => router.push('/about')}
        onOpenUpdates={() => router.push('/updates')}
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
