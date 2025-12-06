"use client";

/**
 * useGameActionsColyseus - Colyseus-native game actions hook
 *
 * Replaces legacy useGameActions (which used SessionService HTTP/SSE).
 * This version uses ColyseusProvider for all communication.
 *
 * Flow:
 * 1. handleStartGame: Connect to Colyseus room → send start_game message
 * 2. Server generates scenario, broadcasts game_started + action_options
 * 3. handleConfirmActions: Send submit_action messages → send advance_round
 * 4. Server processes round, broadcasts new_round + action_options
 */

import { useCallback, useRef } from 'react';
import type { ActionOption } from '@/types';
import { useGame } from '@/hooks/useGame';
import { useUI } from '@/hooks/useUI';
import { useActions } from '@/hooks/useActions';
import { useLobby } from '@/hooks/useLobby';
import { useColyseus } from '@/providers/ColyseusProvider';
import { useGameSenders } from '@/hooks/useGameSenders';

export function useGameActionsColyseus() {
  const { players, setPlayers } = useGame();
  const { setLoading, setError } = useUI();
  const { selectedRoleName } = useLobby();
  const { setActionOptions, setAICompletionStatus, setIsGeneratingOptions } = useActions();
  const { isConnected, isConnecting, connect, sessionId } = useColyseus();
  const { setRole: sendSetRole, submitAction: sendSubmitAction } = useGameSenders();
  const selectRole = useCallback((role: string, name: string) => {
    sendSetRole(role, name);
  }, [sendSetRole]);

  const connectionInProgressRef = useRef(false);

  /**
   * Start game flow (MULTIPLAYER):
   * 1. Connect to Colyseus room (if not already connected)
   * 2. Stay in lobby phase - waiting room will be shown
   * 3. Host clicks "Start Game" in WaitingRoom → sends start_game message
   * 4. Server handles LLM generation, broadcasts game_started + action_options
   */
  const handleStartGame = useCallback(async () => {
    if (!selectedRoleName) {
      setError('Please select a role first');
      return;
    }

    if (connectionInProgressRef.current) {
      console.log('[useGameActionsColyseus] Connection already in progress');
      return;
    }

    if (isConnected) {
      console.log('[useGameActionsColyseus] Already connected to lobby');
      // Don't start the game - waiting room will handle that
      return;
    }

    connectionInProgressRef.current = true;
    setLoading(true, 'Connecting to game server...');

    try {
      // Step 1: Connect to Colyseus room
      console.log('[useGameActionsColyseus] Connecting to Colyseus...', {
        role: selectedRoleName,
      });

      await connect({
        name: `Player-${selectedRoleName}`,
        role: selectedRoleName,
        isHuman: true,
      });

      console.log('[useGameActionsColyseus] Connected! Now in waiting room (lobby phase)');

      // Step 2: Stay in lobby phase - don't call startGame() yet
      // The WaitingRoom component's "Start Game" button will send start_game message
      // when the host is ready

      setLoading(false);
      console.log('[useGameActionsColyseus] Lobby connection complete');

    } catch (error) {
      console.error('[useGameActionsColyseus] Failed to connect:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to game server');
      setLoading(false);
    } finally {
      connectionInProgressRef.current = false;
    }
  }, [selectedRoleName, isConnected, connect, setLoading, setError]);

  /**
   * Confirm actions flow:
   * 1. Submit each selected action to server
   * 2. Mark human player as submitted (optimistic update)
   * 3. Server detects all-submitted and advances the round; broadcasts new_round + action_options
   */
  const handleConfirmActions = useCallback(
    async (actions: ActionOption[]) => {
      const me = players.find((p) => (p as any).id === sessionId);
      if (!me) {
        console.warn('[useGameActionsColyseus] No local player found for this session');
        return;
      }

      if (!isConnected) {
        setError('Not connected to game server');
        return;
      }

      try {
        setLoading(true, 'Submitting your actions...');
        // Frontend enforcement: ensure total cost within available AP
        const totalCost = actions.reduce((sum, a) => sum + (a?.cost || 0), 0);
        if (totalCost > (me.actionPoints || 0)) {
          setError(`You only have ${me.actionPoints} AP but selected ${totalCost} AP worth of actions.`);
          setLoading(false);
          return;
        }

        // Step 1: Submit each action to server
        console.log('[useGameActionsColyseus] Submitting', actions.length, 'actions');
        for (const action of actions) {
          sendSubmitAction(action.title, action.cost);
        }

        // Step 2: Mark human as submitted locally (optimistic update)
        setPlayers((prev) =>
          prev.map((p) => ((p as any).id === sessionId ? { ...p, actions, hasSubmittedActions: true } : p))
        );

        // Step 3: Advance round (triggers server-side consequence generation)
        console.log('[useGameActionsColyseus] Waiting for server to advance...');
        setLoading(true, 'Generating next round... AI players are making decisions.');
        setIsGeneratingOptions(true); // lock UI until next-round options arrive

        // Server will:
        // - Process human actions
        // - Generate AI player actions
        // - Generate consequences via LLM (10-60s)
        // - Update game state (scores, logs, etc.)
        // - Broadcast new_round event
        // - Generate new action options
        // - Broadcast action_options event
        //
        // ColyseusProvider handles all these events and updates stores automatically

        // Clear local action options (new ones will arrive via action_options event)
        setActionOptions([]);
        setAICompletionStatus({});

        // Loading state will be managed by phase changes and isGeneratingOptions flag
        setLoading(false);

        console.log('[useGameActionsColyseus] Actions confirmed - waiting for server...');

      } catch (error: any) {
        console.error('[useGameActionsColyseus] Confirm actions failed:', error);
        setError(error?.message || 'Failed to submit actions');

        // Revert optimistic update
        setPlayers((prev) =>
          prev.map((p) => ((p as any).id === sessionId ? { ...p, hasSubmittedActions: false } : p))
        );

        setLoading(false);
      }
    },
    [players, isConnected, sessionId, sendSubmitAction, setPlayers, setLoading, setError, setActionOptions, setAICompletionStatus]
  );

  return { handleStartGame, handleConfirmActions, selectRole } as const;
}
