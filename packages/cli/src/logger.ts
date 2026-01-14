/**
 * Pretty message logging with timestamps and colors
 */

import chalk from 'chalk';

export class MessageLogger {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get elapsed time since logger creation in MM:SS format
   */
  private getElapsedTime(): string {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Log a server message (received from Colyseus)
   */
  logServerMessage(messageType: string, data: any) {
    const timestamp = chalk.gray(`[${this.getElapsedTime()}]`);
    const type = chalk.cyan(`← ${messageType}`);
    console.log(`${timestamp} ${type}`);

    // Pretty print the data if it's not too large
    if (typeof data === 'object' && data !== null) {
      const dataStr = JSON.stringify(data, null, 2);
      if (dataStr.length < 500) {
        console.log(chalk.gray(dataStr));
      } else {
        // Truncate large objects
        console.log(chalk.gray(dataStr.substring(0, 500) + '...'));
        console.log(chalk.dim(`(${dataStr.length} chars total)`));
      }
    } else {
      console.log(chalk.gray(String(data)));
    }
    console.log(); // Blank line for readability
  }

  /**
   * Log a client message (sent to Colyseus)
   */
  logClientMessage(messageType: string, data?: any) {
    const timestamp = chalk.gray(`[${this.getElapsedTime()}]`);
    const type = chalk.magenta(`→ ${messageType}`);
    console.log(`${timestamp} ${type}`);

    if (data !== undefined) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
    console.log();
  }

  /**
   * Log an info message
   */
  info(message: string) {
    const timestamp = chalk.gray(`[${this.getElapsedTime()}]`);
    console.log(`${timestamp} ${chalk.blue('ℹ')} ${message}`);
  }

  /**
   * Log a success message
   */
  success(message: string) {
    const timestamp = chalk.gray(`[${this.getElapsedTime()}]`);
    console.log(`${timestamp} ${chalk.green('✓')} ${message}`);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error) {
    const timestamp = chalk.gray(`[${this.getElapsedTime()}]`);
    console.log(`${timestamp} ${chalk.red('✗')} ${message}`);
    if (error) {
      console.log(chalk.red(error.stack || error.message));
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string) {
    const timestamp = chalk.gray(`[${this.getElapsedTime()}]`);
    console.log(`${timestamp} ${chalk.yellow('⚠')} ${message}`);
  }

  /**
   * Log a state change
   */
  logStateChange(field: string, oldValue: any, newValue: any) {
    const timestamp = chalk.gray(`[${this.getElapsedTime()}]`);
    console.log(
      `${timestamp} ${chalk.blue('↻')} ${field}: ${chalk.red(String(oldValue))} → ${chalk.green(String(newValue))}`
    );
  }

  /**
   * Clear the console
   */
  clear() {
    console.clear();
  }

  /**
   * Print a separator line
   */
  separator() {
    console.log(chalk.gray('─'.repeat(80)));
  }
}
