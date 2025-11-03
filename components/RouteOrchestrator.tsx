'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useGameController } from '@/hooks/useGameController';
import { GamePhase } from '@/types';
import { useSessionStore } from '@/stores/sessionStore';

export function RouteOrchestrator() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    state: { gameState, players },
  } = useGameController();
  const { hasStartIntent, sessionMeta } = useSessionStore();

  useEffect(() => {
    // End of game: always land on /end and stop evaluating other rules
    if (gameState.phase === GamePhase.END) {
      if (pathname !== '/end') {
        router.replace('/end');
      }
      return;
    }

    const isGamePath = pathname === '/game';
    const startIntentValid = hasStartIntent && (players.length > 0 || !!sessionMeta);
    const shouldBeInGame =
      startIntentValid ||
      gameState.phase === GamePhase.STARTING ||
      gameState.phase === GamePhase.ACTION ||
      gameState.phase === GamePhase.CONSEQUENCE;

    if (shouldBeInGame && !isGamePath) {
      router.replace('/game');
      return;
    }

    if (
      pathname === '/game' &&
      gameState.phase === GamePhase.LOBBY &&
      !hasStartIntent &&
      players.length === 0
    ) {
      router.replace('/lobby');
    }
  }, [router, pathname, hasStartIntent, players.length, gameState.phase]);

  return null;
}
