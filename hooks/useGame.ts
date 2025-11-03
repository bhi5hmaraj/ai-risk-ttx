"use client";

import { useGameStore } from '@/stores/gameStore';

export function useGame() {
  const gameState = useGameStore((s) => s.gameState);
  const players = useGameStore((s) => s.players);
  const setGameState = useGameStore((s) => s.setGameState);
  const setPlayers = useGameStore((s) => s.setPlayers);
  const resetGame = useGameStore((s) => s.reset);
  const humanPlayer = useGameStore((s) => s.humanPlayer());
  const latestLogEntry = useGameStore((s) => s.latestLogEntry());

  return { gameState, players, humanPlayer, latestLogEntry, setGameState, setPlayers, resetGame } as const;
}

