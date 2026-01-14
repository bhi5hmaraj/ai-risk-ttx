/**
 * Intent visualization utilities for CLI (CP5)
 * Displays policy-aware action intents with predicted effects
 */

import chalk from 'chalk';
import type { Intent } from '../../../server/types/core';

/**
 * Format resource deltas with color-coded signs
 */
function formatResourceDelta(delta: number | undefined): string {
  if (delta === undefined || delta === 0) return chalk.dim('  0');
  const sign = delta > 0 ? '+' : '';
  const color = delta > 0 ? chalk.green : chalk.red;
  return color(`${sign}${delta}`);
}

/**
 * Format core metric delta with color
 */
function formatCoreMetricDelta(delta: number | undefined): string {
  if (delta === undefined || delta === 0) return chalk.dim('  0');
  const sign = delta > 0 ? '+' : '';
  const color = delta > 0 ? chalk.green : chalk.red;
  return color(`${sign}${delta}`);
}

/**
 * Format risk level with color
 */
function formatRisk(risk: 'low' | 'medium' | 'high'): string {
  switch (risk) {
    case 'low':
      return chalk.green('Low');
    case 'medium':
      return chalk.yellow('Med');
    case 'high':
      return chalk.red('High');
  }
}

/**
 * Format target string
 */
function formatTarget(target: string): string {
  if (target === 'GLOBAL') return chalk.blue('GLOBAL');
  if (target === 'ENVIRONMENT') return chalk.cyan('ENVIRONMENT');
  return chalk.white(target);
}

/**
 * Display intents as a numbered table with predicted effects
 */
export function displayIntents(intents: Intent[]): void {
  if (!intents || intents.length === 0) {
    console.log(chalk.dim('  No intents available'));
    return;
  }

  console.log();
  console.log(chalk.cyan('Policy-Aware Intents (Predicted Effects):'));
  console.log(chalk.dim('─'.repeat(80)));

  intents.forEach((intent: Intent, index: number) => {
    const cost = chalk.yellow(`${intent.cost} AP`);
    const risk = formatRisk(intent.risk);
    const target = formatTarget(intent.target);

    // Header line: number, title, cost, risk
    console.log(
      chalk.bold(`${index + 1}. ${intent.title}`) +
        ` ${cost} ${chalk.dim('|')} ${risk} ${chalk.dim('→')} ${target}`
    );

    // Description
    console.log(chalk.dim(`   ${intent.description}`));

    // Predicted effects
    const effects: string[] = [];

    // Core metric
    if (intent.deltas.coreMetric !== undefined && intent.deltas.coreMetric !== 0) {
      effects.push(`Core: ${formatCoreMetricDelta(intent.deltas.coreMetric)}`);
    }

    // Target resources (if target is a player)
    if (intent.deltas.targetResources) {
      const tr = intent.deltas.targetResources;
      if (tr.material !== undefined && tr.material !== 0) {
        effects.push(`Target M: ${formatResourceDelta(tr.material)}`);
      }
      if (tr.institutional !== undefined && tr.institutional !== 0) {
        effects.push(`Target I: ${formatResourceDelta(tr.institutional)}`);
      }
      if (tr.narrative !== undefined && tr.narrative !== 0) {
        effects.push(`Target N: ${formatResourceDelta(tr.narrative)}`);
      }
    }

    // Source resources (player's own resources)
    if (intent.deltas.sourceResources) {
      const sr = intent.deltas.sourceResources;
      if (sr.material !== undefined && sr.material !== 0) {
        effects.push(`Your M: ${formatResourceDelta(sr.material)}`);
      }
      if (sr.institutional !== undefined && sr.institutional !== 0) {
        effects.push(`Your I: ${formatResourceDelta(sr.institutional)}`);
      }
      if (sr.narrative !== undefined && sr.narrative !== 0) {
        effects.push(`Your N: ${formatResourceDelta(sr.narrative)}`);
      }
    }

    if (effects.length > 0) {
      console.log(chalk.dim(`   Effects: ${effects.join(', ')}`));
    } else {
      console.log(chalk.dim(`   Effects: None predicted`));
    }

    console.log();
  });

  console.log(chalk.dim('─'.repeat(80)));
}
