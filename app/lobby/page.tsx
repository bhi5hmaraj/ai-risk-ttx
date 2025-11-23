'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { LobbyScreen, LoadingScreen } from '@/screens';
import { Navigation } from '@/components/Navigation';
import { ActionTreePortal } from '@/components/game';
import { ConnectionStatusPill } from '@/components/ConnectionStatus';
import { GamePhase } from '@/types';
import { useLobby } from '@/hooks/useLobby';
import { useUI } from '@/hooks/useUI';
import { useGame } from '@/hooks/useGame';
import { useGameActions } from '@/hooks/useGameActions';
import { useSessionStore } from '@/stores/sessionStore';
import { useActionStore } from '@/stores/actionStore';
import { generateCustomScenario } from '@/services/llmApiClient';
import { GAME_CONFIG } from '@/gameConfig';

function LobbyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedRoleName, setSelectedRoleName, gamePath, setGamePath, customScenario, setCustomScenario, gameSetup, setGameSetup, maxAIPlayers, setMaxAIPlayers, maxRounds, setMaxRounds, isFromPublicCatalog, setIsFromPublicCatalog, reset: resetLobby } = useLobby();
  const { isLoading, loadingMessage, error, setLoading, setError } = useUI();
  const { gameState, resetGame } = useGame();
  const { handleStartGame } = useGameActions();
  const clearSession = useSessionStore ((s) => s.clear);
  const resetActions = useActionStore((s) => s.resetRound);

  // Reset lobby state on mount unless arriving from builder with prefilled setup
  useEffect(() => {
    const from = (searchParams?.get('from') || '').toLowerCase();
    if (from === 'custom-scenario') {
      console.log('[LobbyPage] Arrived from custom-scenario builder; preserving lobby state');
      return;
    }
    console.log('[LobbyPage] Component mounted, resetting lobby state');
    resetLobby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Handler for custom scenario generation
  const handleCustomGameStart = async () => {
    console.log('[LobbyPage] handleCustomGameStart called');
    console.log('[LobbyPage] customScenario:', customScenario);
    console.log('[LobbyPage] customScenario length:', customScenario?.length);
    console.log('[LobbyPage] isLoading:', isLoading);

    if (!customScenario || !customScenario.trim()) {
      console.log('[LobbyPage] No scenario text, returning early');
      return;
    }

    try {
      console.log('[LobbyPage] Setting loading state...');
      setLoading(true, 'Generating custom scenario...');

      console.log('[LobbyPage] Calling generateCustomScenario API...');
      const result = await generateCustomScenario(customScenario, GAME_CONFIG.MAX_AI_PLAYERS_CUSTOM);
      console.log('[LobbyPage] API result:', result);

      if (result) {
        console.log('[LobbyPage] Success! Setting gameSetup:', result);
        setGameSetup(result);
        setError(null);
      } else {
        console.error('[LobbyPage] API returned null');
        setError('Failed to generate custom scenario. Please try again.');
      }
    } catch (error) {
      console.error('[LobbyPage] Error in handleCustomGameStart:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      console.log('[LobbyPage] Clearing loading state');
      setLoading(false);
    }
  };

  // Routing handled by RouteOrchestrator centrally

  const actionTree = (
    <ActionTreePortal isOpen={false} onClose={() => {}} logEntry={null as any} eventLog={gameState.eventLog} />
  );

  // Show loading overlay when starting game (backend connection, session creation, scenario generation)
  // Keep inline loading for custom scenario generation from text input
  const startGameLoadingMessages = ['backend', 'setting up game', 'game master', 'generating the initial'];
  const showLoadingOverlay = isLoading && startGameLoadingMessages.some(msg =>
    (loadingMessage || '').toLowerCase().includes(msg)
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
      <div className="fixed top-4 right-4 z-50">
        <ConnectionStatusPill />
      </div>
      {actionTree}
      {showLoadingOverlay ? (
        <LoadingScreen
          message={loadingMessage || 'Starting game...'}
          error={error}
        />
      ) : (
        <LobbyScreen
          selectedRoleName={selectedRoleName}
          setSelectedRoleName={setSelectedRoleName}
          gamePath={gamePath}
          setGamePath={setGamePath}
          customScenario={customScenario}
          setCustomScenario={setCustomScenario}
          gameSetup={gameSetup}
          setGameSetup={setGameSetup}
          maxAIPlayers={maxAIPlayers}
          setMaxAIPlayers={setMaxAIPlayers}
          maxRounds={maxRounds}
          setMaxRounds={setMaxRounds}
          isFromPublicCatalog={isFromPublicCatalog}
          setIsFromPublicCatalog={setIsFromPublicCatalog}
          isLoading={isLoading}
          handleCustomGameStart={handleCustomGameStart}
          handleStartGame={handleStartGame}
        />
      )}
    </>
  );
}

export default function LobbyPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading..." error={null} />}>
      <LobbyPageContent />
    </Suspense>
  );
}
