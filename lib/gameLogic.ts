import type {
  GameState,
  Player,
  ActionOption,
  AIConsequenceResponse,
  PlayerRoundActions,
  HiddenScoreUpdate,
  AIHiddenScoreUpdate,
} from '../types';
import { GAME_CONFIG } from '../gameConfig';

export const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function convertAiUpdatesToRecord(updates: AIHiddenScoreUpdate[]): Record<string, HiddenScoreUpdate> {
  return Object.fromEntries(updates.map((u) => [u.roleName, { update: u.update, justification: u.justification }]));
}

export function createInitialGameStateFromScenario(
  prev: GameState,
  scenario: AIConsequenceResponse,
  llmCallsThisRound: number,
): GameState {
  const hiddenScoreUpdatesRecord = convertAiUpdatesToRecord(scenario.hiddenScoreUpdates);
  const newScoreValue = clampScore(prev.coreMetric.value + scenario.publicScoreUpdate);
  return {
    ...prev,
    phase: 2, // GamePhase.ACTION, but keep enum-free to avoid import cycles
    round: 1,
    coreMetric: { ...prev.coreMetric, value: newScoreValue },
    currentEvent: scenario.nextEvent,
    eventLog: [
      {
        round: 0,
        roundSummary: scenario.roundSummary,
        outcomeTimeline: scenario.outcomeTimeline ?? [],
        counterfactualNote: scenario.counterfactualNote ?? '',
        event: null,
        playerActions: [],
        publicScoreChange: scenario.publicScoreUpdate,
        publicScoreAfter: newScoreValue,
        hiddenScoreChanges: hiddenScoreUpdatesRecord,
        geminiCalls: llmCallsThisRound,
      },
    ],
  };
}

export function computeAvailableOptionsForPlayers(
  players: Player[],
  aiPlayers: Player[],
  aiTurnResults: { options: ActionOption[] }[] | null
): ActionOption[][] {
  return players.map((p) => {
    if (p.isHuman) return [] as ActionOption[];
    const idx = aiPlayers.findIndex((ap) => ap.id === p.id);
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
  llmCallsThisRound: number,
) {
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
    phase: 2, // GamePhase.ACTION
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
    currentEvent: consequence.nextEvent,
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

  return { gameState: nextState, players: nextPlayers } as const;
}

