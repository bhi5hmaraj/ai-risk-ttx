#!/usr/bin/env node

/**
 * Simulacra CLI - Interactive tool for game development and testing
 */

import { Command } from 'commander';
import { GameClient } from './client.js';
import { MessageLogger } from './logger.js';
import { REPL } from './repl.js';
import { PhaseHandler } from './phases.js';

const DEFAULT_SERVER_URL = process.env.COLYSEUS_URL || 'ws://localhost:3004';

const program = new Command();

program
  .name('sim')
  .description('Simulacra CLI - Interactive tool for game development and testing')
  .version('0.1.0');

/**
 * Create a new game room
 */
program
  .command('create')
  .description('Create a new game room and enter interactive mode')
  .option('-s, --server <url>', 'Server URL', DEFAULT_SERVER_URL)
  .option('-r, --room <name>', 'Room name', 'game')
  .action(async (options) => {
    const logger = new MessageLogger();
    let client: GameClient | null = null;

    const phaseHandler = new PhaseHandler(
      logger,
      () => client?.getSessionId() || null
    );

    client = new GameClient({
      serverUrl: options.server,
      logger,
      onStateChange: (state) => phaseHandler.handleStateChange(state),
      onMessage: (type, message) => {
        // Phase info comes from waiting_status messages
        if (type === 'waiting_status' && message.phase) {
          phaseHandler.handleStateChange(message);
        }
        // Role info comes from players_init messages
        if (type === 'players_init') {
          phaseHandler.handlePlayersInit(message);
        }
        // Action options come from action_options messages
        if (type === 'action_options') {
          phaseHandler.handleActionOptions(message);
        }
        // CP5: Intents with predicted effects come from intents_available messages
        if (type === 'intents_available') {
          phaseHandler.handleIntentsAvailable(message);
        }
        // Policy updated broadcasts (CP4)
        if (type === 'policy_updated') {
          const stances = message.policy?.stances || {};
          const stanceStr = Object.entries(stances)
            .map(([dim, stance]: [string, any]) => {
              const sign = stance.value >= 0 ? '+' : '';
              return `${dim}: ${sign}${stance.value}`;
            })
            .join(', ');
          logger.info(`Policy updated by ${message.playerRole}: ${stanceStr}`);
          try { phaseHandler.handlePolicyUpdated(message); } catch {}
        }
      },
    });

    try {
      // Fetch and display scenarios
      logger.info('Fetching scenarios...');
      const scenarios = await client.fetchScenarios();

      if (scenarios.length > 0) {
        phaseHandler.handleScenarios(scenarios);
      } else {
        logger.warn('No scenarios available, using default');
      }

      // Start REPL for scenario selection
      const repl = new REPL({ client, logger, phaseHandler, roomName: options.room });
      phaseHandler.setUnblockCallback(() => repl.unblockInput());
      repl.start();
    } catch (error) {
      logger.error('Failed to initialize', error as Error);
      process.exit(1);
    }
  });

/**
 * Join an existing room
 */
program
  .command('join <room-id>')
  .description('Join an existing game room by ID')
  .option('-s, --server <url>', 'Server URL', DEFAULT_SERVER_URL)
  .action(async (roomId, options) => {
    const logger = new MessageLogger();
    let client: GameClient | null = null;

    const phaseHandler = new PhaseHandler(
      logger,
      () => client?.getSessionId() || null
    );

    client = new GameClient({
      serverUrl: options.server,
      logger,
      onStateChange: (state) => phaseHandler.handleStateChange(state),
      onMessage: (type, message) => {
        // Phase info comes from waiting_status messages
        if (type === 'waiting_status' && message.phase) {
          phaseHandler.handleStateChange(message);
        }
        // Role info comes from players_init messages
        if (type === 'players_init') {
          phaseHandler.handlePlayersInit(message);
        }
        // Action options come from action_options messages
        if (type === 'action_options') {
          phaseHandler.handleActionOptions(message);
        }
        // CP5: Intents with predicted effects come from intents_available messages
        if (type === 'intents_available') {
          phaseHandler.handleIntentsAvailable(message);
        }
        // Policy updated broadcasts (CP4)
        if (type === 'policy_updated') {
          const stances = message.policy?.stances || {};
          const stanceStr = Object.entries(stances)
            .map(([dim, stance]: [string, any]) => {
              const sign = stance.value >= 0 ? '+' : '';
              return `${dim}: ${sign}${stance.value}`;
            })
            .join(', ');
          logger.info(`Policy updated by ${message.playerRole}: ${stanceStr}`);
          try { phaseHandler.handlePolicyUpdated(message); } catch {}
        }
      },
    });

    try {
      await client.joinRoom(roomId);

      // Start REPL
      const repl = new REPL({ client, logger, phaseHandler });
      repl.start();
    } catch (error) {
      logger.error('Failed to join room', error as Error);
      process.exit(1);
    }
  });

/**
 * Watch mode - join or create room
 */
program
  .command('watch')
  .description('Join or create a game room and watch in real-time')
  .option('-s, --server <url>', 'Server URL', DEFAULT_SERVER_URL)
  .option('-r, --room <name>', 'Room name', 'game')
  .action(async (options) => {
    const logger = new MessageLogger();
    let client: GameClient | null = null;

    const phaseHandler = new PhaseHandler(
      logger,
      () => client?.getSessionId() || null
    );

    client = new GameClient({
      serverUrl: options.server,
      logger,
      onStateChange: (state) => phaseHandler.handleStateChange(state),
      onMessage: (type, message) => {
        // Phase info comes from waiting_status messages
        if (type === 'waiting_status' && message.phase) {
          phaseHandler.handleStateChange(message);
        }
        // Role info comes from players_init messages
        if (type === 'players_init') {
          phaseHandler.handlePlayersInit(message);
        }
        // Action options come from action_options messages
        if (type === 'action_options') {
          phaseHandler.handleActionOptions(message);
        }
        // CP5: Intents with predicted effects come from intents_available messages
        if (type === 'intents_available') {
          phaseHandler.handleIntentsAvailable(message);
        }
        // Policy updated broadcasts (CP4)
        if (type === 'policy_updated') {
          const stances = message.policy?.stances || {};
          const stanceStr = Object.entries(stances)
            .map(([dim, stance]: [string, any]) => {
              const sign = stance.value >= 0 ? '+' : '';
              return `${dim}: ${sign}${stance.value}`;
            })
            .join(', ');
          logger.info(`Policy updated by ${message.playerRole}: ${stanceStr}`);
          try { phaseHandler.handlePolicyUpdated(message); } catch {}
        }
      },
    });

    try {
      await client.joinOrCreate(options.room);

      // Start REPL
      const repl = new REPL({ client, logger, phaseHandler });
      repl.start();
    } catch (error) {
      logger.error('Failed to join/create room', error as Error);
      process.exit(1);
    }
  });

/**
 * Default action - show help
 */
program.action(() => {
  program.help();
});

// Parse arguments
program.parse(process.argv);

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.help();
}
