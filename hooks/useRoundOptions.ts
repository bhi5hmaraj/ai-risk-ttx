"use client";

import { useCallback, useRef } from 'react';
import { useGame } from '@/hooks/useGame';
import { useLobby } from '@/hooks/useLobby';
import { useSession } from '@/hooks/useSession';
import { useUI } from '@/hooks/useUI';
import { useActions } from '@/hooks/useActions';
import { SessionService } from '@/services/SessionService';
import { generateActionOptions } from '@/services/llmApiClient';

export function useRoundOptions() {
  const { gameState, humanPlayer } = (() => {
    const { gameState, players } = useGame();
    const human = players.find((p) => p.isHuman) || null;
    return { gameState, humanPlayer: human } as const;
  })();
  const { gamePath, gameSetup } = useLobby();
  const { sessionMeta, isBackendMode, setSessionMeta } = useSession();
  const { setLoading, setError } = useUI();
  const { setActionOptions } = useActions();
  const inFlightRef = useRef(false);

  const loadHumanOptions = useCallback(async () => {
    if (inFlightRef.current) return;
    if (!humanPlayer) return;
    inFlightRef.current = true;
    setLoading(true, 'Generating action options...');
    try {
      let res: { options: any[] } | null = null;
      if (isBackendMode) {
        let meta = sessionMeta;
        if (!meta) {
          try {
            const created = await SessionService.create({ mode: (gamePath || 'classic') as any, setup: gameSetup || undefined });
            meta = { id: created.id, revision: created.revision, hostToken: created.hostToken } as any;
            setSessionMeta(meta as any);
          } catch (e) {
            console.warn('[useRoundOptions] createSession failed:', e);
          }
        }
        if (meta) {
          const data = await SessionService.getActionOptions(meta.id, humanPlayer.id || 'human', humanPlayer.role.name);
          res = { options: data.options };
        }
      }
      if (!res) {
        const prev = gameState.eventLog.find((e) => e.round === gameState.round - 1);
        res = await generateActionOptions(humanPlayer as any, gameState as any, prev?.playerActions || null);
      }
      if (res) setActionOptions(res.options);
      else setError('Failed to generate action options. You may not be able to proceed.');
    } catch (e) {
      setError('Action options request failed. Check console for details.');
      try { console.error('[useRoundOptions] error:', e); } catch {}
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [humanPlayer, isBackendMode, sessionMeta, gamePath, gameSetup, gameState, setSessionMeta, setLoading, setError, setActionOptions]);

  return { loadHumanOptions } as const;
}

