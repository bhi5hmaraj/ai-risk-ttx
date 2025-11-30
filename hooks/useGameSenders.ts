"use client";

import { useCallback } from 'react';
import { useColyseus } from '@/providers/ColyseusProvider';
import type { SetRoleMessage, SubmitActionMessage, StartGameMessage } from '@/shared/messages';

export function useGameSenders() {
  const { room } = useColyseus();

  const startGame = useCallback(() => {
    if (!room) return;
    const payload = {} as StartGameMessage;
    room.send('start_game', payload);
  }, [room]);

  const setRole = useCallback((role: string, name?: string) => {
    if (!room) return;
    const payload: SetRoleMessage = { role, name };
    room.send('set_role', payload);
  }, [room]);

  const submitAction = useCallback((actionId: string, cost: number) => {
    if (!room) return;
    const payload: SubmitActionMessage = { actionId, cost };
    room.send('submit_action', payload);
  }, [room]);

  return { startGame, setRole, submitAction } as const;
}

