"use client";

/**
 * useGameActionsColyseus - Colyseus-based game actions
 *
 * Simplified version that uses the global ColyseusProvider instead of
 * managing its own connection. This ensures the connection persists
 * across page navigation.
 */

import { useCallback, useRef } from 'react';
import { GamePhase } from '@/types';
import { useGame } from '@/hooks/useGame';
import { useUI } from '@/hooks/useUI';
import { useLobby } from '@/hooks/useLobby';
import { useColyseus } from '@/providers/ColyseusProvider';

export function useGameActionsColyseus() {
  const { setGameState, setPlayers } = useGame();
  const { setLoading, setError } = useUI();
  const { selectedRoleName, gamePath } = useLobby();

  // Use global Colyseus connection
  const colyseus = useColyseus();

  const connectionInProgressRef = useRef(false);

  /**
   * Handle game start - Connect to Colyseus and initialize
   */
  const handleStartGame = useCallback(async () => {
    if (!selectedRoleName) {
      setError('Please select a role first');
      return;
    }

    if (connectionInProgressRef.current || colyseus.isConnected) {
      console.log('[useGameActionsColyseus] Already connected or connecting');
      return;
    }

    connectionInProgressRef.current = true;
    setLoading(true, 'Connecting to game server...');

    try {
      // Connect to Colyseus room
      console.log('[useGameActionsColyseus] Connecting to Colyseus...', {
        role: selectedRoleName,
        path: gamePath,
      });

      await colyseus.connect({
        name: selectedRoleName,
        role: selectedRoleName,
        isHuman: true,
      });

      console.log('[useGameActionsColyseus] Connected! Setting role and starting game...');

      // Set the player's role
      colyseus.setRole(selectedRoleName, selectedRoleName);

      // Start the game
      colyseus.startGame();

      setLoading(false);
      console.log('[useGameActionsColyseus] Game started successfully!');

    } catch (error) {
      console.error('[useGameActionsColyseus] Failed to start game:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to game server');
      setLoading(false);
    } finally {
      connectionInProgressRef.current = false;
    }
  }, [selectedRoleName, gamePath, colyseus, setLoading, setError]);

  /**
   * Handle action confirmation - Submit actions and advance round
   */
  const handleConfirmActions = useCallback(
    async (actions: any[]) => {
      if (!colyseus.isConnected) {
        setError('Not connected to game server');
        return;
      }

      try {
        setLoading(true, 'Submitting your actions...');

        // Submit first action (simplified - just use first action's cost)
        if (actions.length > 0) {
          const firstAction = actions[0];
          colyseus.submitAction(firstAction.title || 'action_1', firstAction.cost || 1);
        }

        // Wait a bit for server to process
        await new Promise(resolve => setTimeout(resolve, 500));

        setLoading(true, 'AI players are making decisions...');

        // Advance the round
        colyseus.advanceRound();

        // State will update via ColyseusProvider's onStateChange callback

      } catch (error) {
        console.error('[useGameActionsColyseus] Failed to confirm actions:', error);
        setError(error instanceof Error ? error.message : 'Failed to submit actions');
      } finally {
        setLoading(false);
      }
    },
    [colyseus, setLoading, setError]
  );

  return {
    handleStartGame,
    handleConfirmActions,
    isConnected: colyseus.isConnected,
    isConnecting: colyseus.isConnecting,
    disconnect: colyseus.disconnect,
  };
}
