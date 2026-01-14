/**
 * /action command - Select actions by number (supports comma-separated)
 */

import chalk from 'chalk';
import type { CommandContext } from './CommandContext.js';
import type { ActionOption } from '../../../../server/types/core.js';
import {
  ValidationError,
  validateArgs,
  parseCommaSeparatedNumbers,
  validateIndex,
  requirePhaseHandler,
  requireArray,
} from './CommandValidators.js';

export function handleActionCommand(args: string[], ctx: CommandContext): void {
  try {
    // Validate input
    validateArgs(args, 1, 'Usage: /action <number>[,<number>...]\nExamples: /action 1  OR  /action 1,2,3');

    // Validate context
    requirePhaseHandler(ctx, 'Action');
    const actions = requireArray<ActionOption>((ctx.phaseHandler as any).actionOptions, 'action');

    // Parse and validate numbers
    const numbers = parseCommaSeparatedNumbers(args);

    // Add actions to selection
    for (const num of numbers) {
      const actionIndex = validateIndex(num, actions.length, 'action');
      const action: ActionOption = actions[actionIndex];

      if (!action || !action.title) {
        console.log(chalk.red(`Invalid action data at index ${num}`));
        continue;
      }

      // Check if already selected
      if (ctx.selectedActions.some(a => a.title === action.title)) {
        console.log(chalk.yellow(`Action already selected: ${action.title}`));
        continue;
      }

      ctx.selectedActions.push(action);
      console.log(chalk.green(`✓ Selected: ${action.title} (${action.cost} AP)`));
    }

    // Show current selection summary
    showSelectedActions(ctx);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(chalk.red(error.message));
    } else {
      console.log(chalk.red('Failed to select action:'), error);
    }
  }
}

/**
 * Show currently selected actions and total cost
 */
function showSelectedActions(ctx: CommandContext): void {
  if (ctx.selectedActions.length === 0) {
    console.log(chalk.dim('\nNo actions selected yet.'));
    return;
  }

  const totalCost = ctx.selectedActions.reduce((sum, a) => sum + a.cost, 0);
  console.log();
  console.log(chalk.cyan(`Selected Actions (${ctx.selectedActions.length}):`));
  ctx.selectedActions.forEach((action, i) => {
    console.log(chalk.dim(`  ${i + 1}. ${action.title} (${action.cost} AP)`));
  });
  console.log(chalk.yellow(`Total Cost: ${totalCost} AP`));
  console.log();
  console.log(chalk.dim('Use /submit to submit these actions, or /action <number> to add more'));
}
