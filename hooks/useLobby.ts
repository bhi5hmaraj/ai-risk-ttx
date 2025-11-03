"use client";

import { useLobbyStore } from '@/stores/lobbyStore';

export function useLobby() {
  const selectedRoleName = useLobbyStore((s) => s.selectedRoleName);
  const gamePath = useLobbyStore((s) => s.gamePath);
  const gameSetup = useLobbyStore((s) => s.gameSetup);
  const customScenario = useLobbyStore((s) => s.customScenario);
  const setSelectedRoleName = useLobbyStore((s) => s.setSelectedRoleName);
  const setGamePath = useLobbyStore((s) => s.setGamePath);
  const setGameSetup = useLobbyStore((s) => s.setGameSetup);
  const setCustomScenario = useLobbyStore((s) => s.setCustomScenario);
  const reset = useLobbyStore((s) => s.reset);

  return {
    selectedRoleName,
    gamePath,
    gameSetup,
    customScenario,
    setSelectedRoleName,
    setGamePath,
    setGameSetup,
    setCustomScenario,
    reset,
  } as const;
}

