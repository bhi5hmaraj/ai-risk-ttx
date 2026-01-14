/**
 * /policy command - Set player policy stances (enum-based with descriptions)
 *
 * Usage: /policy <JSON>
 * Simple: /policy {"privacy": 80, "security": -50}
 * With descriptions: /policy {"privacy": {"value": 80, "description": "Protect user data"}}
 *
 * Dimensions are centralized from PolicyDimension enum
 * Values range from -100 to 100, where sign indicates stance direction
 */

import chalk from 'chalk';
import type { CommandContext } from './CommandContext.js';
import {
  ValidationError,
  validateArgs,
  validatePolicyInput,
} from './CommandValidators.js';
import { ALL_POLICY_DIMENSIONS } from '../policy-runtime.js';
import { displayPolicy } from '../policyUtils.js';

// Get valid dimension keys from centralized config
const VALID_DIMENSION_KEYS = ALL_POLICY_DIMENSIONS.map(d => d.key);

export function handlePolicyCommand(args: string[], ctx: CommandContext): void {
  try {
    // Subcommand: show
    if ((args[0] || '').toLowerCase() === 'show') {
      const state = ctx.phaseHandler?.getState();
      if (!state) {
        console.log(chalk.yellow('No state available'));
        return;
      }
      const me = ctx.client.getSessionId();
      const policy = ctx.phaseHandler?.getPolicyFor?.(me);
      if (!policy || !policy.stances) {
        console.log(chalk.yellow('No policy set yet. Use /policy <JSON> to update.'));
        return;
      }
      console.log();
      displayPolicy(policy.stances);
      return;
    }

    // Validate minimum args
    validateArgs(args, 1,
      'Usage: /policy <JSON>\n' +
      'Simple: /policy {"privacy": 80, "security": -50}\n' +
      'With descriptions: /policy {"privacy": {"value": 80, "description": "Protect user data"}}\n' +
      'Allowed dimensions: ' + VALID_DIMENSION_KEYS.join(', ') + '\n' +
      'Values must be in range [-100, 100]'
    );

    // Parse and validate using centralized validator
    const jsonStr = args.join(' ');
    const stances = validatePolicyInput(jsonStr);

    // Send policy update to server
    console.log(chalk.green(`Setting policy stances:`));
    for (const [dimension, stance] of Object.entries(stances)) {
      const sign = stance.value >= 0 ? '+' : '';
      const desc = stance.description ? ` (${stance.description})` : '';
      console.log(chalk.dim(`  ${dimension}: ${sign}${stance.value}${desc}`));
    }

    ctx.client.send('update_policy', { stances });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(chalk.red(error.message));
    } else {
      console.log(chalk.red('Failed to set policy:'), error);
    }
  }
}
