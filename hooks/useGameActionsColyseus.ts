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

export function useGameActionsColyseus() {
  const { players, setPlayers } = useGame();
  const { setLoading, setError } = useUI();
  const { selectedRoleName } = useLobby();
  const { setActionOptions, setAICompletionStatus, setIsGeneratingOptions } = useActions();
  const { room, isConnected, isConnecting, connect, startGame, submitAction, advanceRound } = useColyseus();

  const connectionInProgressRef = useRef(false);

  /**
   * Start game flow:
   * 1. Connect to Colyseus room (if not already connected)
   * 2. Send start_game message
   * 3. Server handles LLM generation, broadcasts game_started + action_options
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
      console.log('[useGameActionsColyseus] Already connected, just starting game');
      setLoading(true, 'Starting game...');
      setIsGeneratingOptions(true); // ensure loading until options arrive
      startGame();
      // isGeneratingOptions flag (from actionStore) will show loading screen
      setLoading(false);
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

      console.log('[useGameActionsColyseus] Connected! Starting game...');

      // Step 2: Start the game
      setLoading(true, 'Starting game - AI generating scenario...');
      setIsGeneratingOptions(true); // show loading immediately upon start click
      startGame();

      // Server will:
      // - Generate initial scenario via LLM (5-30s)
      // - Broadcast game_started event (triggers isGeneratingOptions = true)
      // - Generate action options for human players
      // - Broadcast action_options event (triggers isGeneratingOptions = false)
      //
      // ColyseusProvider + actionStore handle all state updates automatically

      // Loading state now managed by isGeneratingOptions flag
      setLoading(false);
      console.log('[useGameActionsColyseus] Game start message sent');

    } catch (error) {
      console.error('[useGameActionsColyseus] Failed to start game:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to game server');
      setLoading(false);
    } finally {
      connectionInProgressRef.current = false;
    }
  }, [selectedRoleName, isConnected, isConnecting, connect, startGame, setLoading, setError]);

  /**
   * Confirm actions flow:
   * 1. Submit each selected action to server
   * 2. Mark human player as submitted (optimistic update)
   * 3. Send advance_round message
   * 4. Server processes round, broadcasts new_round + action_options
   */
  const handleConfirmActions = useCallback(
    async (actions: ActionOption[]) => {
      const human = players.find((p) => p.isHuman);
      if (!human) {
        console.warn('[useGameActionsColyseus] No human player found');
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
        if (totalCost > (human.actionPoints || 0)) {
          setError(`You only have ${human.actionPoints} AP but selected ${totalCost} AP worth of actions.`);
          setLoading(false);
          return;
        }

        // Step 1: Submit each action to server
        console.log('[useGameActionsColyseus] Submitting', actions.length, 'actions');
        for (const action of actions) {
          submitAction(action.title, action.cost);
        }

        // Step 2: Mark human as submitted locally (optimistic update)
        setPlayers((prev) =>
          prev.map((p) => (p.isHuman ? { ...p, actions, hasSubmittedActions: true } : p))
        );

        // Step 3: Advance round (triggers server-side consequence generation)
        console.log('[useGameActionsColyseus] Advancing round...');
        setLoading(true, 'Generating next round... AI players are making decisions.');
        setIsGeneratingOptions(true); // lock UI until next-round options arrive
        advanceRound();

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
          prev.map((p) => (p.isHuman ? { ...p, hasSubmittedActions: false } : p))
        );

        setLoading(false);
      }
    },
    [players, isConnected, submitAction, advanceRound, setPlayers, setLoading, setError, setActionOptions, setAICompletionStatus]
  );

  return { handleStartGame, handleConfirmActions } as const;
}
