import type { GameSetup, GameState, Player, ActionOption, CoreMetric, PlayerRoundActions } from '@/types';
import { AI_SAFETY_SCENARIO } from '@/presets';
import { selectInitialPlayers, buildRolesFromSetup as buildRolesFromSetupHelper } from '@/lib/gameSetup';
import { applyConsequences, createInitialGameStateFromScenario } from '@/lib/gameLogic';
import { GamePhase } from '@/types';

export class GameService {
  static buildRolesFromSetup(setup: GameSetup) {
    return buildRolesFromSetupHelper(setup);
  }

  static initializePlayers(
    selectedRoleName: string,
    path: 'classic' | 'custom' | 'ai_safety',
    setup: GameSetup | null,
    defaultCoreMetric: CoreMetric,
    opts?: { aiCount?: number }
  ) {
    return selectInitialPlayers(selectedRoleName, path, setup, AI_SAFETY_SCENARIO, defaultCoreMetric, opts);
  }

  static applyRound(
    currentGameState: GameState,
    consequence: any,
    playersWithActions: Player[],
    aiPlayers: Player[],
    aiTurnResults: { options: ActionOption[]; chosenActions: ActionOption[] }[],
    actionOptions: ActionOption[],
    llmCallsThisRound: number
  ) {
    const { gameState: nextState, players: nextPlayers } = applyConsequences(
      currentGameState,
      consequence,
      playersWithActions,
      aiPlayers,
      aiTurnResults,
      actionOptions,
      llmCallsThisRound,
    );
    return { nextState: { ...nextState, phase: GamePhase.ACTION }, nextPlayers };
  }
}
