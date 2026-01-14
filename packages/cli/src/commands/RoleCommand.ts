/**
 * /role command - Select player role
 */

import chalk from 'chalk';
import type { CommandContext } from './CommandContext.js';
import type { RoleDataCore } from '../../../../server/types/core.js';
import {
  ValidationError,
  validateArgs,
  parsePositiveInt,
  validateIndex,
  requirePhaseHandler,
  requireArray,
  requireProperty,
} from './CommandValidators.js';

// TODO: Server sends nested structure { role: RoleDataCore }
// Consider refactoring server messages to send RoleDataCore directly
interface RoleData {
  role: RoleDataCore;
}

export function handleRoleCommand(args: string[], ctx: CommandContext): void {
  try {
    // Validate input
    validateArgs(args, 1, 'Usage: /role <number>\nExample: /role 2');
    const roleNumber = parsePositiveInt(args[0], 'role number');

    // Validate context
    requirePhaseHandler(ctx, 'Role');
    const roles = requireArray<RoleData>((ctx.phaseHandler as any).availableRoles, 'role');

    // Get selected role
    const roleIndex = validateIndex(roleNumber, roles.length, 'role');
    const selectedRole: RoleData = roles[roleIndex];
    requireProperty(selectedRole, 'role.name', 'role');

    // Send role selection to server
    const roleName = selectedRole.role.name;
    console.log(chalk.green(`Selecting role: ${roleName}`));
    ctx.client.send('set_role', { role: roleName });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(chalk.red(error.message));
    } else {
      console.log(chalk.red('Failed to select role:'), error);
    }
  }
}
