/**
 * Phase-aware handlers for Simulacra CLI
 * Handles different game phases: lobby, action, consequence, end
 */

import chalk from 'chalk';
import { MessageLogger } from './logger.js';
import { displayResources } from './resourceUtils.js';
import { displayPolicy } from './policyUtils.js';

export type GamePhase = 'lobby' | 'starting' | 'action' | 'consequence' | 'end';

export interface PhaseHandlerOptions {
  logger: MessageLogger;
  state: any;
  prevPhase: GamePhase | null;
}

export class PhaseHandler {
  private logger: MessageLogger;
  private currentPhase: GamePhase | null = null;
  private state: any = null;
  public availableRoles: any[] = []; // Public so REPL can access it
  public actionOptions: any[] = []; // Public so REPL can access it
  public availableScenarios: any[] = []; // Public so REPL can access it
  private onUnblockInput?: () => void; // Callback to unblock REPL input
  private getSessionId?: () => string | null; // Callback to get current session ID
  private policies: Record<string, any> = {}; // Latest policy per playerId
  public intents: any[] = []; // CP5: Store available intents with predicted effects

  constructor(logger: MessageLogger, getSessionId?: () => string | null) {
    this.logger = logger;
    this.getSessionId = getSessionId;
  }

  /**
   * Set callback to unblock REPL input after loading
   */
  setUnblockCallback(callback: () => void) {
    this.onUnblockInput = callback;
  }

  /**
   * Handle players_init message to store available roles
   */
  handlePlayersInit(payload: any) {
    if (payload && payload.players) {
      this.availableRoles = payload.players;
      this.logger.info(`Received ${this.availableRoles.length} available roles`);
    }
  }

  /**
   * Handle scenarios list to store available scenarios
   */
  handleScenarios(scenarios: any[]) {
    this.availableScenarios = scenarios;
    this.logger.info(`Received ${this.availableScenarios.length} scenarios`);

    // Display scenarios as numbered table
    console.log();
    console.log(chalk.cyan('Available Scenarios:'));
    console.log(chalk.dim('─'.repeat(80)));
    this.availableScenarios.forEach((scenario: any, index: number) => {
      const badge = scenario.source === 'official'
        ? chalk.blue('[Official]')
        : chalk.green('[Community]');
      console.log(chalk.bold(`${index + 1}. ${scenario.gameSetup.scenarioTitle} ${badge}`));
      console.log(chalk.dim(`   ${scenario.gameSetup.scenarioDescription}`));
      if (scenario.source === 'contributed' && scenario.voteCount) {
        console.log(chalk.dim(`   👍 ${scenario.voteCount} votes`));
      }
      console.log();
    });
    console.log(chalk.dim('─'.repeat(80)));
    console.log();
    console.log(chalk.dim('Commands:'));
    console.log(chalk.dim('  /scenario <number>  - Select scenario (e.g., /scenario 1)'));
  }

  /**
   * Handle action_options message to store available actions
   */
  handleActionOptions(payload: any) {
    if (payload && payload.options) {
      this.actionOptions = payload.options;
      this.logger.info(`Received ${this.actionOptions.length} action options`);

      // Display actions as a numbered table
      console.log();
      console.log(chalk.cyan('Available Actions:'));
      console.log(chalk.dim('─'.repeat(80)));
      this.actionOptions.forEach((action: any, index: number) => {
        const cost = action.cost ? ` (${action.cost} AP)` : '';
        console.log(chalk.bold(`${index + 1}. ${action.title}${chalk.yellow(cost)}`));
        console.log(chalk.dim(`   ${action.description}`));
        console.log();
      });
      console.log(chalk.dim('─'.repeat(80)));
      console.log();
      console.log(chalk.dim('Commands:'));
      console.log(chalk.dim('  /action <number>[,<number>...]  - Select action(s) (e.g., /action 1  OR  /action 1,2,3)'));
      console.log(chalk.dim('  /submit                          - Submit selected actions'));
    }
  }

  /**
   * CP5: Handle intents_available message to store intents with predicted effects
   */
  handleIntentsAvailable(payload: any) {
    if (payload && payload.intents) {
      this.intents = payload.intents;
      this.logger.info(`Received ${this.intents.length} intents with predicted effects`);

      // Display will be handled by intentUtils (imported later)
      // For now, just log that intents were received
      console.log(chalk.dim(`\n(Received ${this.intents.length} policy-aware intents with predicted effects)`));
    }
  }

  /**
   * Handle policy_updated broadcast and cache policy by playerId
   */
  handlePolicyUpdated(payload: { playerId: string; policy: any }) {
    if (!payload || !payload.playerId || !payload.policy) return;
    this.policies[payload.playerId] = payload.policy;
  }

  /**
   * Get cached policy for a given player (by sessionId)
   */
  getPolicyFor(sessionId: string | null): any | null {
    if (!sessionId) return null;
    return this.policies[sessionId] || null;
  }

  /**
   * Handle state change and route to appropriate phase handler
   */
  handleStateChange(state: any) {
    const newPhase = state.phase as GamePhase;
    const prevPhase = this.currentPhase;

    // Update stored state
    this.state = state;

    // Skip if phase is undefined
    if (!newPhase) {
      return;
    }

    // Detect phase transition
    if (newPhase !== prevPhase) {
      this.onPhaseTransition(prevPhase, newPhase);
      this.currentPhase = newPhase;
    }

    // Route to phase handler
    switch (newPhase) {
      case 'lobby':
        this.handleLobby(state);
        break;
      case 'starting':
        this.handleStarting(state);
        break;
      case 'action':
        this.handleAction(state);
        break;
      case 'consequence':
        this.handleConsequence(state);
        break;
      case 'end':
        this.handleEnd(state);
        break;
      default:
        this.logger.warn(`Unknown phase: ${newPhase}`);
    }
  }

  /**
   * Handle phase transitions
   */
  private onPhaseTransition(from: GamePhase | null, to: GamePhase) {
    this.logger.separator();

    if (from) {
      this.logger.info(
        chalk.bold(`Phase: ${chalk.red(from.toUpperCase())} → ${chalk.green(to.toUpperCase())}`)
      );
    } else {
      this.logger.info(chalk.bold(`Phase: ${chalk.green(to.toUpperCase())}`));
    }

    this.logger.separator();
  }

  /**
   * LOBBY phase: Show players, roles, ready status
   */
  private handleLobby(state: any) {
    this.logger.info(chalk.cyan('Welcome to the Lobby!'));

    // Display available roles from players_init data
    if (this.availableRoles.length > 0) {
      console.log();
      console.log(chalk.cyan('Available Roles:'));
      this.availableRoles.forEach((player: any, index: number) => {
        if (!player || !player.role || !player.role.name) {
          return; // Skip players without role data
        }
        const status = player.isTaken
          ? chalk.red('✗ Taken')
          : chalk.green('✓ Available');
        console.log(`  ${index + 1}. ${chalk.bold(player.role.name)} - ${status}`);
      });
      console.log();
    }

    // Show ready status if available
    if (state.humansTotal !== undefined) {
      const readyStatus = `${state.humansReady || 0}/${state.humansTotal} players ready`;
      this.logger.info(readyStatus);

      if (state.allHumansReady) {
        this.logger.success('All players ready! Game starting soon...');
      }
    }

    console.log();
    console.log(chalk.dim('Commands:'));
    console.log(chalk.dim('  /role <number>                                - Select role by number (e.g., /role 2)'));
    console.log(chalk.dim('  /start                                        - Start the game'));
  }

  /**
   * STARTING phase: Game is initializing
   */
  private handleStarting(state: any) {
    this.logger.info(chalk.yellow('⏳ Game is starting...'));
    this.logger.info(chalk.dim('Generating initial scenario with LLM (10-20 seconds)'));
    console.log(chalk.dim('The server is creating:'));
    console.log(chalk.dim('  • Opening scenario and crisis description'));
    console.log(chalk.dim('  • Initial game state and metrics'));
  }

  /**
   * ACTION phase: Show state, AP, submission status
   */
  private handleAction(state: any) {
    this.logger.info(chalk.cyan(`Round ${state.round || 0} - Action Phase`));

    if (state.coreMetric !== undefined) {
      const health = state.coreMetric.value || state.coreMetric;
      const healthColor = health > 50 ? chalk.green : health > 25 ? chalk.yellow : chalk.red;
      console.log(`  Core Metric: ${healthColor(health)}`);
    }

    // Show player resources (CP3) - extract from Colyseus state
    if (this.getSessionId && state.players) {
      const sessionId = this.getSessionId();
      if (sessionId) {
        const player = state.players.get?.(sessionId) || state.players[sessionId];
        if (player && typeof player.material === 'number') {
          console.log();
          displayResources({
            material: player.material,
            institutional: player.institutional,
            narrative: player.narrative,
          });
        }

        // Show your policy if we have it
        const policy = this.policies[sessionId];
        if (policy && policy.stances) {
          console.log();
          displayPolicy(policy.stances);
        }
      }
    }

    // Show player count and submission status
    if (state.humansTotal !== undefined) {
      const submitted = state.humansReady || 0;
      const total = state.humansTotal;
      console.log(`  Submissions: ${submitted}/${total}`);
    }

    console.log();
    console.log(chalk.dim('Commands: /action <number>, /submit'));

    // Unblock input now that we're in action phase
    if (this.onUnblockInput) {
      this.onUnblockInput();
    }
  }

  /**
   * CONSEQUENCE phase: Show waiting state
   */
  private handleConsequence(state: any) {
    this.logger.info(chalk.yellow('⏳ Processing round...'));
    this.logger.info(chalk.dim('Server calculating consequences with LLM (10-20 seconds)'));
    console.log(chalk.dim('The server is:'));
    console.log(chalk.dim('  • Generating AI player actions'));
    console.log(chalk.dim('  • Calculating counterfactual baseline'));
    console.log(chalk.dim('  • Generating round consequences'));
    console.log(chalk.dim('  • Updating game state'));
  }

  /**
   * END phase: Show final results
   */
  private handleEnd(state: any) {
    this.logger.separator();
    this.logger.info(chalk.bold.green('GAME OVER'));
    this.logger.separator();

    if (state.coreMetric !== undefined) {
      const finalScore = state.coreMetric.value || state.coreMetric;
      console.log(`  Final Core Metric: ${chalk.bold(finalScore)}`);
    }

    if (state.round !== undefined) {
      console.log(`  Rounds Completed: ${chalk.bold(state.round)}`);
    }

    console.log();

    // Determine outcome
    if (state.coreMetric) {
      const score = state.coreMetric.value || state.coreMetric;
      if (score > 50) {
        this.logger.success('Democracy survived! 🎉');
      } else if (score > 0) {
        this.logger.warn('Democracy is fragile...');
      } else {
        this.logger.error('Democracy has collapsed.');
      }
    }

    console.log();
    console.log(chalk.dim('Commands: /state to review final state'));
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): GamePhase | null {
    return this.currentPhase;
  }

  /**
   * Get current state
   */
  getState(): any {
    return this.state;
  }
}
