"use client";

import { useCallback, useRef } from 'react';
import { useGame } from '@/hooks/useGame';
import { useColyseus } from '@/providers/ColyseusProvider';

/**
 * useRoundOptions - Colyseus Migration
 *
 * This hook is now a no-op for Colyseus flow. Action options are automatically:
 * 1. Generated server-side in GameStartHandler
 * 2. Broadcast via room.send('action_options')
 * 3. Received in ColyseusProvider.onMessage('action_options')
 * 4. Stored in actionStore via setActionOptions()
 *
 * The loadHumanOptions() function is kept for compatibility but does nothing.
 * GamePage still calls it, but it's harmless since Colyseus handles everything.
 */
export function useRoundOptions() {
  const { gameState, humanPlayer } = (() => {
    const { gameState, players } = useGame();
    const human = players.find((p) => p.isHuman) || null;
    return { gameState, humanPlayer: human } as const;
  })();
  const { isConnected } = useColyseus();
  const inFlightRef = useRef(false);

  const loadHumanOptions = useCallback(async () => {
    console.log('[useRoundOptions] 🎯 loadHumanOptions called (Colyseus mode - no-op)');
    console.log('[useRoundOptions] State:', {
      inFlight: inFlightRef.current,
      hasHumanPlayer: !!humanPlayer,
      humanPlayerRole: humanPlayer?.role?.name,
      isConnected,
      gamePhase: gameState?.phase,
      round: gameState?.round
    });

    // Colyseus flow: Action options are automatically sent from server
    // No need to make HTTP request here
    console.log('[useRoundOptions] ⏭️ Skipping - Colyseus handles action options automatically');

    // If we're not connected, log a warning
    if (!isConnected) {
      console.warn('[useRoundOptions] ⚠️ Not connected to Colyseus - action options may not arrive');
    }
  }, [humanPlayer, isConnected, gameState]);

  return { loadHumanOptions } as const;
}
