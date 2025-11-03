'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LobbyScreen } from '@/screens';
import { Navigation } from '@/components/Navigation';
import { ActionTreePortal } from '@/components/game';
import { GamePhase } from '@/types';
import { useLobby } from '@/hooks/useLobby';
import { useUI } from '@/hooks/useUI';
import { useGame } from '@/hooks/useGame';
import { useGameActions } from '@/hooks/useGameActions';
import { useSessionStore } from '@/stores/sessionStore';
import { useActionStore } from '@/stores/actionStore';

export default function LobbyPage() {
  const router = useRouter();
  const { selectedRoleName, setSelectedRoleName, gamePath, setGamePath, customScenario, setCustomScenario, gameSetup, setGameSetup, reset: resetLobby } = useLobby();
  const { isLoading } = useUI();
  const { gameState, resetGame } = useGame();
  const { handleStartGame } = useGameActions();
  const clearSession = useSessionStore((s) => s.clear);
  const resetActions = useActionStore((s) => s.resetRound);

  // Routing handled by RouteOrchestrator centrally

  const actionTree = (
    <ActionTreePortal isOpen={false} onClose={() => {}} logEntry={null as any} eventLog={gameState.eventLog} />
  );

  return (
    <>
      <Navigation
        onNavigateHome={() => {
          // reset stores for a clean lobby/home transition
          resetGame();
          resetLobby();
          resetActions();
          try { clearSession(); } catch {}
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
        handleCustomGameStart={() => {/* deprecated path removed in modular step; use presets or custom form */}}
        handleStartGame={handleStartGame}
      />
    </>
  );
}
