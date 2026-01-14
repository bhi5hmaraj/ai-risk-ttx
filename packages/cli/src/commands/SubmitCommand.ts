/**
 * /submit command - Submit selected actions
 */

import chalk from 'chalk';
import type { CommandContext } from './CommandContext.js';
import { ValidationError } from './CommandValidators.js';

export function handleSubmitCommand(ctx: CommandContext): void {
  try {
    // Validate selection
    if (ctx.selectedActions.length === 0) {
      throw new ValidationError('No actions selected. Use /action <number> first.');
    }

    console.log(chalk.cyan(`\n⏳ Submitting ${ctx.selectedActions.length} action(s)...`));

    // Send each action to server
    for (const action of ctx.selectedActions) {
      ctx.client.send('submit_action', {
        actionId: action.title,
        cost: action.cost
      });
    }

    // Clear selection after submit
    ctx.selectedActions = [];
    console.log(chalk.green('✓ Actions submitted'));
    console.log(chalk.cyan('⏳ Waiting for other players...'));
    console.log(chalk.dim('   Once all players submit, the round will be processed (10-20 seconds)'));

    // Block input while waiting for round processing
    ctx.blockInput();
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(chalk.red(error.message));
    } else {
      console.log(chalk.red('Failed to submit actions:'), error);
    }
  }
}
