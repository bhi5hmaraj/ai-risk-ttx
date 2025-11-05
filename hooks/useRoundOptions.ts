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
    if (inFlightRef.current) return;
    if (!humanPlayer) return;
    inFlightRef.current = true;
    setLoading(true, 'Generating action options...');
    try {
      if (!sessionMeta) {
        setError('Game session not initialized. Please return to lobby and start again.');
        return;
      }
      const data = await SessionService.getActionOptions(sessionMeta.id, humanPlayer.id || 'human', humanPlayer.role.name);
      setActionOptions(data.options);
    } catch (e) {
      setError('Action options request failed. Check console for details.');
      try { console.error('[useRoundOptions] error:', e); } catch {}
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [humanPlayer, sessionMeta, gameState, setLoading, setError, setActionOptions]);

  return { loadHumanOptions } as const;
}
