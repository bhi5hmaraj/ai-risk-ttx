/**
 * Interactive REPL (Read-Eval-Print-Loop) for Simulacra CLI
 */

import * as readline from 'readline';
import chalk from 'chalk';
import { GameClient } from './client.js';
import { MessageLogger } from './logger.js';
import type { PhaseHandler } from './phases.js';
import type { CommandContext } from './commands/index.js';
import {
  handleScenarioCommand,
  handleRoleCommand,
  handleActionCommand,
  handleSubmitCommand,
  handleStartCommand,
  handlePolicyCommand,
  handleHelpCommand,
  handleStateCommand,
  handleRoomCommand,
  handleSendCommand,
  handleClearCommand,
  suggestCommand,
} from './commands/index.js';
import { handleResourceCommand } from './commands/index.js';

export interface REPLOptions {
  client: GameClient;
  logger: MessageLogger;
  phaseHandler?: PhaseHandler;
  roomName?: string; // Room name for deferred creation
}

export class REPL {
  private rl: readline.Interface;
  private client: GameClient;
  private logger: MessageLogger;
  private phaseHandler?: PhaseHandler;
  private running: boolean = false;
  private selectedActions: any[] = [];  // Track selected actions before submit
  private isLoading: boolean = false;   // Track if server is processing
  private selectedScenario: any = null; // Track selected scenario
  private roomName: string;             // Room name for creation
  private roomCreated: boolean = false; // Track if room has been created

  constructor(options: REPLOptions) {
    this.client = options.client;
    this.logger = options.logger;
    this.phaseHandler = options.phaseHandler;
    this.roomName = options.roomName || 'game';

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.green('sim> '),
    });
  }

  /**
   * Start the REPL
   */
  start() {
    this.running = true;
    handleHelpCommand();
    this.rl.prompt();

    this.rl.on('line', (line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        this.rl.prompt();
        return;
      }

      this.handleCommand(trimmed);
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      this.logger.info('Goodbye!');
      process.exit(0);
    });
  }

  /**
   * Block user input during loading
   */
  private blockInput() {
    this.isLoading = true;
    this.rl.pause();
  }

  /**
   * Unblock user input after loading
   */
  public unblockInput() {
    this.isLoading = false;
    this.rl.resume();
    this.rl.prompt();
  }

  /**
   * Build command context for command handlers
   */
  private getCommandContext(): CommandContext {
    return {
      client: this.client,
      logger: this.logger,
      phaseHandler: this.phaseHandler,
      roomName: this.roomName,
      roomCreated: this.roomCreated,
      selectedScenario: this.selectedScenario,
      selectedActions: this.selectedActions,
      isLoading: this.isLoading,
      blockInput: () => this.blockInput(),
      unblockInput: () => this.unblockInput(),
    };
  }

  /**
   * Handle a command
   */
  private async handleCommand(line: string) {
    // Ignore commands while loading
    if (this.isLoading) {
      console.log(chalk.yellow('⏸  Please wait... server is processing'));
      return;
    }

    const parts = line.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    const ctx = this.getCommandContext();

    switch (command) {
      case 'help':
      case '?':
        handleHelpCommand();
        break;

      case 'state':
        handleStateCommand(ctx);
        break;

      case 'room':
        handleRoomCommand(ctx);
        break;

      case 'send':
        handleSendCommand(args, ctx);
        break;

      case 'clear':
        handleClearCommand(ctx);
        break;

      case 'exit':
      case 'quit':
        this.rl.close();
        break;

      case '/scenario':
        await handleScenarioCommand(args, ctx);
        // Update local state after command execution
        this.selectedScenario = ctx.selectedScenario;
        this.roomCreated = ctx.roomCreated;
        break;

      case '/role':
        handleRoleCommand(args, ctx);
        break;

      case '/action':
        handleActionCommand(args, ctx);
        // Update local state after command execution
        this.selectedActions = ctx.selectedActions;
        break;

      case '/start':
        handleStartCommand(ctx);
        break;

      case '/submit':
        handleSubmitCommand(ctx);
        // Update local state after command execution
        this.selectedActions = ctx.selectedActions;
        break;

      case '/policy':
        handlePolicyCommand(args, ctx);
        break;

      case '/resource':
      case '/resources':
        handleResourceCommand(args, ctx);
        break;

      default:
        // Show error for unknown commands instead of sending to server
        this.logger.error(`Unknown command: ${command}`);
        console.log(chalk.dim('Type "help" for available commands'));

        // Suggest correct command if it looks like a typo
        if (command.startsWith('/')) {
          const suggestions = suggestCommand(command);
          if (suggestions.length > 0) {
            console.log(chalk.yellow(`Did you mean: ${suggestions.join(', ')}?`));
          }
        }
        break;
    }
  }


  /**
   * Stop the REPL
   */
  stop() {
    this.running = false;
    this.rl.close();
  }
}
