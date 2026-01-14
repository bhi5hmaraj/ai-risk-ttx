/**
 * Shared context for all CLI commands
 * Provides access to client, logger, phase handler, and command state
 */

import type { GameClient } from '../client.js';
import type { MessageLogger } from '../logger.js';
import type { PhaseHandler } from '../phases.js';

export interface CommandContext {
  // Core services
  client: GameClient;
  logger: MessageLogger;
  phaseHandler?: PhaseHandler;

  // Room state
  roomName: string;
  roomCreated: boolean;

  // Selection state
  selectedScenario: any;
  selectedActions: any[];

  // UI state
  isLoading: boolean;

  // Callbacks
  blockInput: () => void;
  unblockInput: () => void;
}

/**
 * Helper to validate room is created before command execution
 */
export function requireRoom(ctx: CommandContext, commandName: string): boolean {
  if (!ctx.roomCreated) {
    console.log(`Please select a scenario first with /scenario <number>`);
    return false;
  }
  return true;
}
