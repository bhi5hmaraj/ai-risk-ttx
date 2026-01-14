/**
 * Utility commands - help, state, room, send, clear
 */

import chalk from 'chalk';
import type { CommandContext } from './CommandContext.js';

/**
 * Show help message with available commands
 */
export function handleHelpCommand(): void {
  console.log(chalk.cyan('\nAvailable Commands:'));
  console.log(chalk.dim('─'.repeat(80)));

  const commands = [
    ['help, ?', 'Show this help message'],
    ['state', 'Show current game state'],
    ['room', 'Show room information'],
    ['send <type> [data]', 'Send a message to the server'],
    ['/<type> [data]', 'Shorthand for send (e.g., /ready)'],
    ['/policy <JSON>', 'Update your policy stances (e.g., /policy {"privacy":80})'],
    ['/policy show', 'Show your current policy as bars'],
    ['/resource show', 'Show your current resources as bars'],
    ['clear', 'Clear the screen'],
    ['exit, quit', 'Exit the REPL'],
  ];

  commands.forEach(([cmd, desc]) => {
    console.log(`  ${chalk.green(cmd.padEnd(25))} ${chalk.dim(desc)}`);
  });

  console.log(chalk.dim('─'.repeat(80)));
  console.log();

  console.log(chalk.cyan('Examples:'));
  console.log(chalk.dim('  /ready                              Send ready message'));
  console.log(chalk.dim('  /set_role {"roleId": "gov"}         Select role'));
  console.log(chalk.dim('  send start_game                     Start the game'));
  console.log(chalk.dim('  state                               View current state'));
  console.log(chalk.dim('  /policy {"privacy": 80}             Set a simple numeric stance'));
  console.log(chalk.dim('  /policy {"privacy": {"value": 80, "description": "Protect users"}}'));
  console.log(chalk.dim('  /policy show                      Display your current policy'));
  console.log(chalk.dim('  /resource show                    Display your M/I/N resources'));
  console.log();
  console.log(chalk.cyan('Policy Dimensions:'));
  console.log(chalk.dim('  privacy, security, transparency, accountability, innovation, regulation'));
  console.log();
}

/**
 * Show current game state
 */
export function handleStateCommand(ctx: CommandContext): void {
  const state = ctx.client.getState();

  if (!state) {
    console.log(chalk.yellow('No state available'));
    return;
  }

  console.log(chalk.cyan('\nCurrent State:'));
  console.log(JSON.stringify(state, null, 2));
}

/**
 * Show room information
 */
export function handleRoomCommand(ctx: CommandContext): void {
  const roomId = ctx.client.getRoomId();

  if (!roomId) {
    console.log(chalk.yellow('Not connected to a room'));
    return;
  }

  console.log(chalk.cyan('\nRoom Information:'));
  console.log(`  ID: ${chalk.green(roomId)}`);
  console.log(`  Connected: ${chalk.green('Yes')}`);
}

/**
 * Send a raw message to the server
 */
export function handleSendCommand(args: string[], ctx: CommandContext): void {
  if (args.length < 1) {
    console.log(chalk.red('Usage: send <message_type> [data]'));
    return;
  }

  const messageType = args[0];
  const data = args.length > 1 ? parseArgs(args.slice(1)) : undefined;

  ctx.client.send(messageType, data);
}

/**
 * Clear the logger (screen)
 */
export function handleClearCommand(ctx: CommandContext): void {
  ctx.logger.clear();
}

/**
 * Suggest similar commands for typos
 */
export function suggestCommand(command: string): string[] {
  const knownCommands = [
    '/scenario',
    '/role',
    '/action',
    '/start',
    '/submit',
    '/policy',
    '/policy show',
    '/resource',
    '/resources',
    '/resource show',
    'help',
    'state',
    'room',
    'send',
    'clear',
    'exit',
    'quit',
  ];

  const stripped = command.toLowerCase();
  return knownCommands.filter(
    (cmd) => cmd.includes(stripped.substring(0, 4)) || stripped.includes(cmd.substring(0, 4))
  );
}

/**
 * Parse command arguments into data object
 * Tries JSON first, falls back to string
 */
function parseArgs(args: string[]): any {
  const joined = args.join(' ');
  try {
    return JSON.parse(joined);
  } catch {
    return joined;
  }
}
