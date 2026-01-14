/**
 * /scenario command - Select a scenario and create room
 */

import chalk from 'chalk';
import type { CommandContext } from './CommandContext.js';
import type { GameSetup } from '../../../../server/types/core.js';
import {
  ValidationError,
  validateArgs,
  parsePositiveInt,
  validateIndex,
  requirePhaseHandler,
  requireArray,
  requireProperty,
} from './CommandValidators.js';

// Type for scenario data from API
interface ScenarioData {
  gameSetup: GameSetup;
  source?: string;
  voteCount?: number;
}

export async function handleScenarioCommand(args: string[], ctx: CommandContext): Promise<void> {
  try {
    // Validate input
    validateArgs(args, 1, 'Usage: /scenario <number>\nExample: /scenario 1');
    const scenarioNumber = parsePositiveInt(args[0], 'scenario number');

    // Validate context
    requirePhaseHandler(ctx, 'Scenario');
    const scenarios = requireArray<ScenarioData>((ctx.phaseHandler as any).availableScenarios, 'scenario');

    // Get selected scenario
    const scenarioIndex = validateIndex(scenarioNumber, scenarios.length, 'scenario');
    const selectedScenario: ScenarioData = scenarios[scenarioIndex];
    requireProperty(selectedScenario, 'gameSetup', 'scenario');

    // Update context
    ctx.selectedScenario = selectedScenario;
    console.log(chalk.green(`\n✓ Selected: ${selectedScenario.gameSetup.scenarioTitle}`));
    console.log(chalk.dim(`  ${selectedScenario.gameSetup.scenarioDescription}\n`));

    // Create room with selected gameSetup
    console.log(chalk.cyan('Creating room...'));
    await ctx.client.createRoom(ctx.roomName, selectedScenario.gameSetup);
    ctx.roomCreated = true;
    console.log(chalk.green('✓ Room created successfully!\n'));
    console.log(chalk.dim('Now select your role with /role <number>'));
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(chalk.red(error.message));
    } else {
      console.log(chalk.red('Failed to create room:'), error);
    }
  }
}
