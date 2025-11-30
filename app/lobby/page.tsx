'use client';

import React, { useEffect, Suspense, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { LobbyScreen, LoadingScreen } from '@/screens';
import { Navigation } from '@/components/Navigation';
import { ActionTreePortal } from '@/components/game';
import { GamePhase } from '@/types';
import { useLobby } from '@/hooks/useLobby';
import { useUI } from '@/hooks/useUI';
import { useGame } from '@/hooks/useGame';
import { useColyseus } from '@/providers/ColyseusProvider';
import { useSessionStore } from '@/stores/sessionStore';
import { useActionStore } from '@/stores/actionStore';
import { generateCustomScenario } from '@/services/llmApiClient';
import { GAME_CONFIG } from '@/gameConfig';
import { generateRoomCode } from '@/server/lib/roomCodeGenerator';

function LobbyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedRoleName, setSelectedRoleName, gamePath, setGamePath, customScenario, setCustomScenario, gameSetup, setGameSetup, maxAIPlayers, setMaxAIPlayers, maxRounds, setMaxRounds, isFromPublicCatalog, setIsFromPublicCatalog, reset: resetLobby } = useLobby();
  const { isLoading, loadingMessage, error, setLoading, setError } = useUI();
  const { gameState, resetGame } = useGame();
  const { isConnected, state: colyseusState, room } = useColyseus();
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

  // Navigate to game/:code after a successful connection (SPA flow)
  useEffect(() => {
    if (isConnected && room?.state?.roomCode) {
      const code = room.state.roomCode;
      console.log('[LobbyPage] Connected to room, routing to /game/' + code);
      router.push(`/game/${code}`);
    }
  }, [isConnected, room?.state?.roomCode, router]);

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

  // --- SPA-style quick join (role chosen after joining) ---
  const [joinName, setJoinName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const { connect } = useColyseus();

  const handleJoinByCode = useCallback(async () => {
    const name = (joinName || 'Guest').trim();
    const code = (joinCode || '').trim().toUpperCase();
    if (!code) return;
    try {
      setLoading(true, 'Joining room...');
      await connect({ name, role: '', isHuman: true, gameId: code });
      // Routing happens in the isConnected effect above
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  }, [joinName, joinCode, connect, setLoading, setError]);

  // Host creates a game (no role yet; roles are chosen inside waiting room)
  const handleCreateGame = useCallback(async () => {
    try {
      setLoading(true, 'Creating game...');
      const code = generateRoomCode();
      await connect({ name: 'Host', role: '', isHuman: true, isHost: true, gameId: code });
      // Routing happens in the isConnected effect above
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  }, [connect, setLoading, setError]);

  // Lobby setup screen
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
          onCreateGame={handleCreateGame}
          onJoinByCode={(name, code) => {
            setJoinName(name);
            setJoinCode(code);
            handleJoinByCode();
          }}
          onNavigateToCustomScenario={() => router.push('/custom-scenario')}
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
