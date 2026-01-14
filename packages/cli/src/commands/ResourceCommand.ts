import chalk from 'chalk';
import type { CommandContext } from './CommandContext.js';
import { displayResources } from '../resourceUtils.js';

export function handleResourceCommand(args: string[], ctx: CommandContext): void {
  const sub = (args[0] || '').toLowerCase();

  if (sub !== 'show') {
    console.log(chalk.red('Usage: /resource show'));
    return;
  }

  const state = ctx.phaseHandler?.getState();
  if (!state) {
    console.log(chalk.yellow('No state available'));
    return;
  }

  const sessionId = ctx.client.getSessionId();
  const player = state.players?.get?.(sessionId) || state.players?.[sessionId];
  if (!player) {
    console.log(chalk.yellow('Player not found in state'));
    return;
  }

  if (typeof player.material !== 'number' || typeof player.institutional !== 'number' || typeof player.narrative !== 'number') {
    console.log(chalk.yellow('Resources not available yet'));
    return;
  }

  console.log();
  displayResources({
    material: player.material,
    institutional: player.institutional,
    narrative: player.narrative,
  });
}

