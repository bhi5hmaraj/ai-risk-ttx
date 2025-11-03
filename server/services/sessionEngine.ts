import { GAME_CONFIG } from '@/gameConfig';
import type {
  GameState,
  Player,
  ActionOption,
  AIConsequenceResponse,
  PlayerRoundActions,
  AIHiddenScoreUpdate,
  GameSetup,
} from '@/server/types/core';

export const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function convertAiUpdatesToRecord(updates: AIHiddenScoreUpdate[]): Record<string, { update: number; justification: string }> {
  return Object.fromEntries(updates.map((u) => [u.roleName, { update: u.update, justification: u.justification }]));
}

export function buildPlayersFromSetup(
  setup: GameSetup,
  humanRoleName?: string,
  existingPlayers?: Player[]
): Player[] {
  if (existingPlayers && existingPlayers.length > 0) {
    return existingPlayers;
  }

  return setup.stakeholders.map((stakeholder, index) => {
    const id = stakeholder.name === humanRoleName ? 'human_player' : `ai_${index}`;
    return {
      id,
      role: {
        name: stakeholder.name,
        publicObjective: stakeholder.publicObjective,
        hiddenObjective: stakeholder.hiddenObjective,
        resources: stakeholder.resources ?? [],
        constraints: stakeholder.constraints ?? [],
      },
      isHuman: stakeholder.name === humanRoleName,
      hiddenScore: 0,
      actionPoints: GAME_CONFIG.INITIAL_ACTION_POINTS,
      actions: [],
      hasSubmittedActions: false,
    } satisfies Player;
  });
}

function computeAvailableOptionsForPlayers(
  players: Player[],
  aiPlayers: Player[],
  aiTurnResults: { options: ActionOption[] }[] | null
): ActionOption[][] {
  return players.map((p) => {
    if (p.isHuman) return [];
    const idx = aiPlayers.findIndex((ai) => ai.id === p.id);
    return idx !== -1 && aiTurnResults && aiTurnResults[idx] ? aiTurnResults[idx].options || [] : [];
  });
}

export function applyConsequences(
  currentGameState: GameState,
  consequence: AIConsequenceResponse,
  playersWithActions: Player[],
  aiPlayers: Player[],
  aiTurnResults: { options: ActionOption[] }[] | null,
  humanActionOptions: ActionOption[],
  llmCallsThisRound: number
): { gameState: GameState; players: Player[] } {
  const hiddenScoreUpdatesRecord = convertAiUpdatesToRecord(consequence.hiddenScoreUpdates);
  const newScoreValue = clampScore(currentGameState.coreMetric.value + consequence.publicScoreUpdate);

  const availableByIdx = computeAvailableOptionsForPlayers(playersWithActions, aiPlayers, aiTurnResults);

  const playerActionsForLog: PlayerRoundActions[] = playersWithActions.map((p, idx) => ({
    roleName: p.role.name,
    actions: p.actions,
    availableOptions: p.isHuman ? humanActionOptions : availableByIdx[idx] || [],
    isHuman: p.isHuman,
  }));

  const nextState: GameState = {
    ...currentGameState,
    phase: currentGameState.phase, // caller controls phase transitions
    round: currentGameState.round + 1,
    coreMetric: { ...currentGameState.coreMetric, value: newScoreValue },
    eventLog: [
      ...currentGameState.eventLog,
      {
        round: currentGameState.round,
        roundSummary: consequence.roundSummary,
        outcomeTimeline: consequence.outcomeTimeline ?? [],
        counterfactualNote: consequence.counterfactualNote ?? '',
        event: currentGameState.currentEvent,
        playerActions: playerActionsForLog,
        publicScoreChange: consequence.publicScoreUpdate,
        publicScoreAfter: newScoreValue,
        hiddenScoreChanges: hiddenScoreUpdatesRecord,
        geminiCalls: llmCallsThisRound,
      },
    ],
    currentEvent: consequence.nextEvent?.headline
      ? ({ id: `evt_${Date.now()}_${currentGameState.round + 1}`, ...consequence.nextEvent } as any)
      : consequence.nextEvent,
  };

  const nextPlayers: Player[] = playersWithActions.map((p) => {
    const pointsSpent = p.actions.reduce((sum, action) => sum + action.cost, 0);
    const newPoints = Math.min(
      p.actionPoints - pointsSpent + GAME_CONFIG.ACTION_POINTS_PER_ROUND,
      GAME_CONFIG.MAX_ACTION_POINTS
    );
    return {
      ...p,
      hiddenScore: p.hiddenScore + (hiddenScoreUpdatesRecord[p.role.name]?.update || 0),
      actionPoints: newPoints,
      actions: [],
      hasSubmittedActions: false,
    };
  });

  return { gameState: nextState, players: nextPlayers };
}
