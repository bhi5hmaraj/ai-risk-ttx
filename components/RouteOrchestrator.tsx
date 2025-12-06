'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
import { GamePhase } from '@/types';
import { useSessionStore } from '@/stores/sessionStore';
import { useColyseus } from '@/providers/ColyseusProvider';

export function RouteOrchestrator() {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const gameState = useGameStore((state) => state.gameState);
  const players = useGameStore((state) => state.players);
  const { hasStartIntent, sessionMeta } = useSessionStore();
  const { state: colyseusState } = useColyseus();
  const roomCode = colyseusState?.roomCode || '';

  useEffect(() => {
    // Always allow visiting Home explicitly
    if (pathname === '/') {
      return;
    }
    // End of game: always land on /end and stop evaluating other rules
    if (gameState.phase === GamePhase.END) {
      if (pathname !== '/end') {
        router.replace('/end');
      }
      return;
    }

    const isGamePath = pathname.startsWith('/game');
    const startIntentValid = hasStartIntent && (players.length > 0 || !!sessionMeta);
    const shouldBeInGame =
      startIntentValid ||
      gameState.phase === GamePhase.STARTING ||
      gameState.phase === GamePhase.ACTION ||
      gameState.phase === GamePhase.CONSEQUENCE;

    if (shouldBeInGame && !isGamePath) {
      if (roomCode) {
        router.replace(`/game/${roomCode}`);
      } else {
        router.replace('/game');
      }
      return;
    }

    // Normalize base /game to /game/:code when available
    if (pathname === '/game' && roomCode) {
      router.replace(`/game/${roomCode}`);
      return;
    }

    // SPA flow: allow staying on /game even during lobby phase. No redirect to /lobby here.
  }, [router, pathname, hasStartIntent, players.length, gameState.phase, sessionMeta]);

  return null;
}
