"use client";

import { useCallback, useRef } from 'react';
import { useGame } from '@/hooks/useGame';
import { useSession } from '@/hooks/useSession';
import { useUI } from '@/hooks/useUI';
import { useActions } from '@/hooks/useActions';
import { SessionService } from '@/services/SessionService';

export function useRoundOptions() {
  const { gameState, humanPlayer } = (() => {
    const { gameState, players } = useGame();
    const human = players.find((p) => p.isHuman) || null;
    return { gameState, humanPlayer: human } as const;
  })();
  const { sessionMeta } = useSession();
  const { setLoading, setError } = useUI();
  const { setActionOptions } = useActions();
  const inFlightRef = useRef(false);

  const loadHumanOptions = useCallback(async () => {
    console.log('[useRoundOptions] 🎯 loadHumanOptions called');
    console.log('[useRoundOptions] State:', {
      inFlight: inFlightRef.current,
      hasHumanPlayer: !!humanPlayer,
      humanPlayerRole: humanPlayer?.role?.name,
      sessionId: sessionMeta?.id,
      gamePhase: gameState?.phase,
      round: gameState?.round
    });

    if (inFlightRef.current) {
      console.log('[useRoundOptions] ⏭️ Skipping - already in flight');
      return;
    }
    if (!humanPlayer) {
      console.log('[useRoundOptions] ⏭️ Skipping - no human player');
      return;
    }

    inFlightRef.current = true;
    setLoading(true, 'Generating action options...');
    const startTime = Date.now();

    try {
      if (!sessionMeta) {
        console.error('[useRoundOptions] ❌ No session meta');
        setError('Game session not initialized. Please return to lobby and start again.');
        return;
      }

      console.log('[useRoundOptions] 📡 Calling SessionService.getActionOptions...');
      console.log('[useRoundOptions] Request:', {
        sessionId: sessionMeta.id,
        playerId: humanPlayer.id || 'human',
        role: humanPlayer.role.name
      });

      const data = await SessionService.getActionOptions(
        sessionMeta.id,
        humanPlayer.id || 'human',
        humanPlayer.role.name
      );

      const duration = Date.now() - startTime;
      console.log('[useRoundOptions] ✅ Received options:', {
        count: data.options.length,
        duration: `${duration}ms`,
        options: data.options.map(o => o.title)
      });

      setActionOptions(data.options);
    } catch (e) {
      const duration = Date.now() - startTime;
      console.error('[useRoundOptions] ❌ Error after', duration, 'ms:', e);
      setError('Action options request failed. Check console for details.');
      try { console.error('[useRoundOptions] Full error:', e); } catch {}
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [humanPlayer, sessionMeta, setLoading, setError, setActionOptions, gameState]);

  return { loadHumanOptions } as const;
}
