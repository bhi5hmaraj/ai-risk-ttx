/**
 * Resource utilities for CLI display (CP3)
 * Handles visualization of M/I/N resources
 */

import chalk from 'chalk';

/**
 * Create a progress bar visualization for resource values (0-100)
 */
export function progressBar(value: number, max: number = 100, width: number = 20): string {
  const clampedValue = Math.max(0, Math.min(max, value));
  const filled = Math.round((clampedValue / max) * width);
  const empty = width - filled;

  // Color based on value percentage
  const percentage = (clampedValue / max) * 100;
  let barColor = chalk.green;
  if (percentage < 33) barColor = chalk.red;
  else if (percentage < 66) barColor = chalk.yellow;

  const bar = barColor('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
  return `${bar} ${clampedValue.toString().padStart(3)}`;
}

/**
 * Display all three resource bars for a player
 */
export function displayResources(resources: { material: number; institutional: number; narrative: number }): void {
  console.log(chalk.dim('  Resources:'));
  console.log(`    ${chalk.cyan('Material'.padEnd(14))} ${progressBar(resources.material)}`);
  console.log(`    ${chalk.blue('Institutional'.padEnd(14))} ${progressBar(resources.institutional)}`);
  console.log(`    ${chalk.magenta('Narrative'.padEnd(14))} ${progressBar(resources.narrative)}`);
}
