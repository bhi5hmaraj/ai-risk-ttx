/**
 * /start command - Start the game
 */

import chalk from 'chalk';
import type { CommandContext } from './CommandContext.js';
import { ValidationError } from './CommandValidators.js';

export function handleStartCommand(ctx: CommandContext): void {
  try {
    // Validate room is created
    if (!ctx.roomCreated) {
      throw new ValidationError('Please create a room first by selecting a scenario with /scenario <number>');
    }

    // Simplified start command
    ctx.client.send('start_game', {});
    console.log(chalk.cyan('⏳ Starting game...'));
    console.log(chalk.dim('   Generating initial scenario with LLM (this may take 10-20 seconds)'));

    // Block input while waiting for game start
    ctx.blockInput();
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(chalk.red(error.message));
    } else {
      console.log(chalk.red('Failed to start game:'), error);
    }
  }
}
