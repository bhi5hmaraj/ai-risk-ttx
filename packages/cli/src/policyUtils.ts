/**
 * Policy visualization utilities for CLI (CP4)
 */
import chalk from 'chalk';
import { ALL_POLICY_DIMENSIONS } from './policy-runtime.js';

/**
 * Render a bi-directional bar for values in [-100, 100]
 * Left (red) = negative, Right (green) = positive, center at 0
 */
export function bipolarBar(value: number, maxAbs: number = 100, halfWidth: number = 10): string {
  const v = Math.max(-maxAbs, Math.min(maxAbs, value));
  const leftFill = v < 0 ? Math.round((Math.abs(v) / maxAbs) * halfWidth) : 0;
  const rightFill = v > 0 ? Math.round((v / maxAbs) * halfWidth) : 0;
  const leftEmpty = halfWidth - leftFill;
  const rightEmpty = halfWidth - rightFill;

  const left = chalk.red('█'.repeat(leftFill)) + chalk.dim('░'.repeat(leftEmpty));
  const center = chalk.gray('|');
  const right = chalk.green('█'.repeat(rightFill)) + chalk.dim('░'.repeat(rightEmpty));

  const sign = v > 0 ? '+' : v < 0 ? '' : ' ';
  return `${left}${center}${right} ${sign}${v.toString().padStart(3)}`;
}

/**
 * Display policy stances as bars in canonical dimension order
 */
export function displayPolicy(stances: Record<string, { value: number; description?: string }>): void {
  console.log(chalk.dim('  Policy:'));
  for (const dim of ALL_POLICY_DIMENSIONS) {
    const s = stances?.[dim.key];
    const value = typeof s?.value === 'number' ? s.value : 0;
    console.log(`    ${chalk.white(dim.key.padEnd(14))} ${bipolarBar(value)}`);
  }
}

