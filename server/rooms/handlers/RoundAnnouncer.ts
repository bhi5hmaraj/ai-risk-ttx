import { GamePhase, type GameState as CoreGameState, type Player as CorePlayer } from '../../types/core';
import * as llmService from '../../services/llmService';
import type { GameState as SchemaGameState } from '../schema/GameState';
import type { createLogger } from '../../lib/logger';

export interface AnnounceDeps {
  schemaState: SchemaGameState; // Colyseus Schema (for round number convenience)
  coreState: CoreGameState;     // Full Core state (with eventLog/currentEvent)
  players: CorePlayer[];        // Current players for this round
  broadcast: (type: string, message?: any) => void;
  logger: ReturnType<typeof createLogger>;
  initial?: boolean;            // true on initial game start flow
}

/**
 * Unified round announcement and next-step option generation.
 * Used by both GameStartHandler and RoundAdvanceHandler.
 */
export async function announceRoundTransition({ schemaState, coreState, players, broadcast, logger, initial }: AnnounceDeps) {
  // 1) Broadcast round result (Key Moments / Score Δ) and current event
  const lastLog = coreState.eventLog[coreState.eventLog.length - 1];
  if (lastLog) {
    logger.info('round-announce', 'broadcast:round_result', {
      round: lastLog.round,
      delta: lastLog.publicScoreChange,
      actions: lastLog.playerActions?.map(pa => ({ role: pa.roleName, count: pa.actions?.length || 0 }))
    });
    broadcast('round_result', lastLog);
  }

  broadcast('current_event', coreState.currentEvent);

  // 2) If game ended, tell clients and stop
  if (coreState.phase === GamePhase.END) {
    logger.info('round-announce', 'broadcast:game_ended', { round: coreState.round - 1 });
    broadcast('game_ended', { round: coreState.round - 1 });
    return;
  }

  // 3) Announce entry into action phase
  if (initial) {
    broadcast('game_started');
  } else {
    broadcast('new_round', { round: schemaState.round });
  }

  // 4) Generate human action options for the round (AIs choose via GameController; humans need options)
  const humanPlayers = players.filter(p => p.isHuman);
  const prevActions = coreState.eventLog.length > 0 ? coreState.eventLog[coreState.eventLog.length - 1].playerActions : null;

  for (const player of humanPlayers) {
    try {
      const optionsResp = await llmService.generateActionOptions(player, coreState, prevActions);
      const options = optionsResp?.options || [];
      broadcast('action_options', { playerId: player.id, options, round: coreState.round });
      logger.info('round-announce', 'broadcast:action_options', { playerId: player.id, optionCount: options.length });
    } catch (e) {
      logger.error('round-announce', 'action_options:failed', { playerId: player.id, error: e });
    }
  }
}

