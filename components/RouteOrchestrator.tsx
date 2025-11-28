'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
import { GamePhase } from '@/types';
import { useSessionStore } from '@/stores/sessionStore';

export function RouteOrchestrator() {
  const router = useRouter();
  const pathname = usePathname();
  const gameState = useGameStore((state) => state.gameState);
  const players = useGameStore((state) => state.players);
  const { hasStartIntent, sessionMeta } = useSessionStore();

  useEffect(() => {
    console.log('[RouteOrchestrator] Evaluating navigation:', {
      pathname,
      'gameState.phase': gameState.phase,
      'GamePhase.END': GamePhase.END,
      'phase === END': gameState.phase === GamePhase.END,
      'typeof phase': typeof gameState.phase,
      hasStartIntent,
      playerCount: players.length,
      sessionMeta: !!sessionMeta,
    });

    // Always allow visiting Home explicitly
    if (pathname === '/') {
      console.log('[RouteOrchestrator] On home, no navigation');
      return;
    }
    // End of game: always land on /end and stop evaluating other rules
    if (gameState.phase === GamePhase.END) {
      console.log('[RouteOrchestrator] END phase detected, navigating to /end');
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

    console.log('[RouteOrchestrator] shouldBeInGame logic:', {
      isGamePath,
      startIntentValid,
      shouldBeInGame,
      'will navigate to game': shouldBeInGame && !isGamePath,
    });

    if (shouldBeInGame && !isGamePath) {
      console.log('[RouteOrchestrator] Navigating to /game');
      router.replace('/game');
      return;
    }

    if (
      pathname === '/game' &&
      gameState.phase === GamePhase.LOBBY &&
      !hasStartIntent &&
      players.length === 0
    ) {
      console.log('[RouteOrchestrator] Navigating to /lobby');
      router.replace('/lobby');
    }
  }, [router, pathname, hasStartIntent, players.length, gameState.phase, sessionMeta]);

  return null;
}
