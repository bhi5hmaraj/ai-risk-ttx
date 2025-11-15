"use client";

import { useLobbyStore } from '@/stores/lobbyStore';

export function useLobby() {
  const selectedRoleName = useLobbyStore((s) => s.selectedRoleName);
  const gamePath = useLobbyStore((s) => s.gamePath);
  const gameSetup = useLobbyStore((s) => s.gameSetup);
  const customScenario = useLobbyStore((s) => s.customScenario);
  const maxAIPlayers = useLobbyStore((s) => s.maxAIPlayers);
  const maxRounds = useLobbyStore((s) => s.maxRounds);
  const isFromPublicCatalog = useLobbyStore((s) => s.isFromPublicCatalog);
  const setSelectedRoleName = useLobbyStore((s) => s.setSelectedRoleName);
  const setGamePath = useLobbyStore((s) => s.setGamePath);
  const setGameSetup = useLobbyStore((s) => s.setGameSetup);
  const setCustomScenario = useLobbyStore((s) => s.setCustomScenario);
  const setMaxAIPlayers = useLobbyStore((s) => s.setMaxAIPlayers);
  const setMaxRounds = useLobbyStore((s) => s.setMaxRounds);
  const setIsFromPublicCatalog = useLobbyStore((s) => s.setIsFromPublicCatalog);
  const reset = useLobbyStore((s) => s.reset);

  return {
    selectedRoleName,
    gamePath,
    gameSetup,
    customScenario,
    maxAIPlayers,
    maxRounds,
    isFromPublicCatalog,
    setSelectedRoleName,
    setGamePath,
    setGameSetup,
    setCustomScenario,
    setMaxAIPlayers,
    setMaxRounds,
    setIsFromPublicCatalog,
    reset,
  } as const;
}
