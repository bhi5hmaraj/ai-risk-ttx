#!/usr/bin/env tsx

/**
 * Crisis Command - Feedback Analytics CLI
 *
 * Query and analyze feedback data from the database
 *
 * Usage:
 *   npm run analyze                    # Show all feedback (local DB)
 *   npm run analyze -- --env preview   # Query preview database
 *   npm run analyze -- --model gpt-4   # Filter by model
 *   npm run analyze -- --scenario classic --export feedback.csv
 *   npm run analyze -- --stats         # Show statistics only
 *   npm run analyze -- --help          # Show all options
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

interface AnalyticsOptions {
  env?: 'local' | 'preview' | 'production';
  model?: string;
  scenarioType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  completed?: boolean;
  export?: string;
  stats?: boolean;
  limit?: number;
  help?: boolean;
}

// Load environment-specific DATABASE_URL
function loadEnvironment(env: 'local' | 'preview' | 'production') {
  const envFiles = {
    local: '.env',
    preview: '.env.development.preview',
    production: '.env.production',
  };

  const envFile = envFiles[env];
  const envPath = resolve(process.cwd(), envFile);

  console.log(`🔧 Loading environment: ${env} (${envFile})`);

  const result = config({ path: envPath, override: true });

  if (result.error) {
    console.warn(`⚠️  Warning: Could not load ${envFile}, using default DATABASE_URL`);
  }

  // For preview/production, use Prisma Accelerate URL instead of direct connection
  if (env !== 'local') {
    if (process.env.PRISMA_DATABASE_URL) {
      process.env.DATABASE_URL = process.env.PRISMA_DATABASE_URL;
      console.log(`📋 Using PRISMA_DATABASE_URL (Accelerate) for ${env} environment`);
    } else {
      console.error(`❌ Error: PRISMA_DATABASE_URL not found in ${envFile}`);
      console.error('   Cloud databases require Prisma Accelerate URL');
      process.exit(1);
    }
  }

  // Check if DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    console.error(`❌ Error: DATABASE_URL not found in ${envFile}`);
    console.error('   Make sure the file exists and contains DATABASE_URL');
    process.exit(1);
  }

  console.log(`✅ Using DATABASE_URL from ${env} environment\n`);
}

// Initialize Prisma client (after env is loaded)
let prisma: PrismaClient;

// Parse command line arguments
function parseArgs(): AnalyticsOptions {
  const args = process.argv.slice(2);
  const options: AnalyticsOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--env':
      case '-e':
        const env = args[++i];
        if (env === 'local' || env === 'preview' || env === 'production') {
          options.env = env;
        } else {
          console.error(`❌ Invalid environment: ${env}`);
          console.error('   Valid options: local, preview, production');
          process.exit(1);
        }
        break;
      case '--model':
        options.model = args[++i];
        break;
      case '--scenario':
      case '--scenarioType':
        options.scenarioType = args[++i];
        break;
      case '--from':
        options.dateFrom = new Date(args[++i]);
        break;
      case '--to':
        options.dateTo = new Date(args[++i]);
        break;
      case '--completed':
        options.completed = args[++i]?.toLowerCase() !== 'false';
        break;
      case '--export':
        options.export = args[++i];
        break;
      case '--stats':
        options.stats = true;
        break;
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
📊 Crisis Command - Feedback Analytics CLI

USAGE:
  npm run analyze [OPTIONS]

OPTIONS:
  --env, -e <env>         Environment: local, preview, or production (default: local)
  --model <name>          Filter by LLM model (e.g., gpt-4o-mini)
  --scenario <type>       Filter by scenario type (classic/ai_safety/custom)
  --from <date>           Filter from date (YYYY-MM-DD)
  --to <date>             Filter to date (YYYY-MM-DD)
  --completed <bool>      Filter by game completion (true/false)
  --limit <number>        Limit number of results
  --stats                 Show statistics only (no individual entries)
  --export <file>         Export to CSV or JSON file
  --help, -h              Show this help message

EXAMPLES:
  # Show all feedback from local database
  npm run analyze

  # Query preview database
  npm run analyze -- --env preview

  # Query production database
  npm run analyze -- --env production --stats

  # Filter by model (preview environment)
  npm run analyze -- --env preview --model gpt-4o-mini

  # Filter by scenario and completion
  npm run analyze -- --scenario classic --completed true

  # Show statistics only
  npm run analyze -- --stats

  # Export preview data to CSV
  npm run analyze -- --env preview --export feedback-preview.csv

  # Filter by date range
  npm run analyze -- --from 2025-01-01 --to 2025-12-31

  # Combine filters
  npm run analyze -- --env preview --model gpt-4 --scenario ai_safety --limit 10
`);
}

async function getFeedback(options: AnalyticsOptions) {
  const where: any = {};

  if (options.model) {
    where.model = { contains: options.model, mode: 'insensitive' };
  }

  if (options.scenarioType) {
    where.scenarioType = options.scenarioType;
  }

  if (options.completed !== undefined) {
    where.gameCompleted = options.completed;
  }

  if (options.dateFrom || options.dateTo) {
    where.createdAt = {};
    if (options.dateFrom) {
      where.createdAt.gte = options.dateFrom;
    }
    if (options.dateTo) {
      where.createdAt.lte = options.dateTo;
    }
  }

  const feedback = await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit,
  });

  return feedback;
}

function calculateStats(feedback: any[]) {
  if (feedback.length === 0) {
    return {
      total: 0,
      avgRating: 0,
      byModel: {},
      byScenario: {},
      byCompletion: { completed: 0, incomplete: 0 },
      ratingBreakdown: {
        ui: 0,
        gameDynamics: 0,
        modelQuality: 0,
        scenario: 0,
        actions: 0,
        stakeholders: 0,
      },
    };
  }

  const byModel: Record<string, number> = {};
  const byScenario: Record<string, number> = {};
  const byCompletion = { completed: 0, incomplete: 0 };
  const ratingSum = {
    ui: 0,
    gameDynamics: 0,
    modelQuality: 0,
    scenario: 0,
    actions: 0,
    stakeholders: 0,
  };

  let totalAvgRating = 0;

  for (const entry of feedback) {
    // Count by model
    const model = entry.model || 'unknown';
    byModel[model] = (byModel[model] || 0) + 1;

    // Count by scenario
    const scenario = entry.scenarioType || 'unknown';
    byScenario[scenario] = (byScenario[scenario] || 0) + 1;

    // Count completion
    if (entry.gameCompleted) {
      byCompletion.completed++;
    } else {
      byCompletion.incomplete++;
    }

    // Sum ratings
    if (entry.avgRating) {
      totalAvgRating += entry.avgRating;
    }

    // Sum individual ratings
    const data = entry.data as any;
    if (data?.ratings) {
      ratingSum.ui += data.ratings.ui || 0;
      ratingSum.gameDynamics += data.ratings.gameDynamics || 0;
      ratingSum.modelQuality += data.ratings.modelQuality || 0;
      ratingSum.scenario += data.ratings.scenario || 0;
      ratingSum.actions += data.ratings.actions || 0;
      ratingSum.stakeholders += data.ratings.stakeholders || 0;
    }
  }

  return {
    total: feedback.length,
    avgRating: totalAvgRating / feedback.length,
    byModel,
    byScenario,
    byCompletion,
    ratingBreakdown: {
      ui: ratingSum.ui / feedback.length,
      gameDynamics: ratingSum.gameDynamics / feedback.length,
      modelQuality: ratingSum.modelQuality / feedback.length,
      scenario: ratingSum.scenario / feedback.length,
      actions: ratingSum.actions / feedback.length,
      stakeholders: ratingSum.stakeholders / feedback.length,
    },
  };
}

function displayStats(stats: ReturnType<typeof calculateStats>) {
  console.log('\n📊 STATISTICS\n');
  console.log(`Total Feedback Entries: ${stats.total}`);
  console.log(`Average Overall Rating: ${stats.avgRating.toFixed(2)}/10`);
  console.log('');

  console.log('📈 Rating Breakdown (Average):');
  console.log(`  UI:             ${stats.ratingBreakdown.ui.toFixed(2)}/10`);
  console.log(`  Game Dynamics:  ${stats.ratingBreakdown.gameDynamics.toFixed(2)}/10`);
  console.log(`  Model Quality:  ${stats.ratingBreakdown.modelQuality.toFixed(2)}/10`);
  console.log(`  Scenario:       ${stats.ratingBreakdown.scenario.toFixed(2)}/10`);
  console.log(`  Actions:        ${stats.ratingBreakdown.actions.toFixed(2)}/10`);
  console.log(`  Stakeholders:   ${stats.ratingBreakdown.stakeholders.toFixed(2)}/10`);
  console.log('');

  console.log('🤖 By Model:');
  for (const [model, count] of Object.entries(stats.byModel)) {
    console.log(`  ${model}: ${count}`);
  }
  console.log('');

  console.log('🎮 By Scenario Type:');
  for (const [scenario, count] of Object.entries(stats.byScenario)) {
    console.log(`  ${scenario}: ${count}`);
  }
  console.log('');

  console.log('✅ Game Completion:');
  console.log(`  Completed:   ${stats.byCompletion.completed}`);
  console.log(`  Incomplete:  ${stats.byCompletion.incomplete}`);
  console.log('');
}

function displayFeedback(feedback: any[]) {
  console.log('\n📝 FEEDBACK ENTRIES\n');

  for (const entry of feedback) {
    const data = entry.data as any;

    console.log(`ID: ${entry.id}`);
    console.log(`Date: ${new Date(entry.createdAt).toLocaleDateString()}`);
    console.log(`Model: ${entry.model || 'N/A'}`);
    console.log(`Scenario: ${entry.scenarioType || 'N/A'}`);
    console.log(`Role: ${entry.rolePlayed || 'N/A'}`);
    console.log(`Completed: ${entry.gameCompleted ? 'Yes' : 'No'}`);
    console.log(`Average Rating: ${entry.avgRating?.toFixed(2) || 'N/A'}/10`);

    if (data?.ratings) {
      console.log('Ratings:');
      console.log(`  UI: ${data.ratings.ui}/10`);
      console.log(`  Game Dynamics: ${data.ratings.gameDynamics}/10`);
      console.log(`  Model Quality: ${data.ratings.modelQuality}/10`);
      console.log(`  Scenario: ${data.ratings.scenario}/10`);
      console.log(`  Actions: ${data.ratings.actions}/10`);
      console.log(`  Stakeholders: ${data.ratings.stakeholders}/10`);
    }

    if (data?.responses?.improvements) {
      console.log(`Improvements: "${data.responses.improvements}"`);
    }

    console.log('---');
  }
}

async function exportToCSV(feedback: any[], filename: string) {
  const rows: string[] = [];

  // Header
  rows.push(
    'ID,Date,Model,Scenario,Role,Completed,AvgRating,UI,GameDynamics,ModelQuality,ScenarioRating,Actions,Stakeholders,Improvements'
  );

  // Data rows
  for (const entry of feedback) {
    const data = entry.data as any;
    const ratings = data?.ratings || {};

    const row = [
      entry.id,
      new Date(entry.createdAt).toISOString(),
      entry.model || '',
      entry.scenarioType || '',
      entry.rolePlayed || '',
      entry.gameCompleted ? 'Yes' : 'No',
      entry.avgRating?.toFixed(2) || '',
      ratings.ui || '',
      ratings.gameDynamics || '',
      ratings.modelQuality || '',
      ratings.scenario || '',
      ratings.actions || '',
      ratings.stakeholders || '',
      `"${(data?.responses?.improvements || '').replace(/"/g, '""')}"`,
    ];

    rows.push(row.join(','));
  }

  const csv = rows.join('\n');
  const fs = await import('fs/promises');
  await fs.writeFile(filename, csv);

  console.log(`✅ Exported ${feedback.length} entries to ${filename}`);
}

async function exportToJSON(feedback: any[], filename: string) {
  const fs = await import('fs/promises');
  await fs.writeFile(filename, JSON.stringify(feedback, null, 2));

  console.log(`✅ Exported ${feedback.length} entries to ${filename}`);
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  // Load environment (default to local)
  const env = options.env || 'local';
  loadEnvironment(env);

  // Initialize Prisma client after environment is loaded
  prisma = new PrismaClient();

  console.log('🔍 Querying feedback database...\n');

  try {
    const feedback = await getFeedback(options);

    console.log(`Found ${feedback.length} feedback entries`);

    const stats = calculateStats(feedback);

    if (options.stats) {
      // Stats only
      displayStats(stats);
    } else {
      // Show entries and stats
      displayFeedback(feedback);
      displayStats(stats);
    }

    // Export if requested
    if (options.export) {
      const filename = options.export;
      if (filename.endsWith('.csv')) {
        await exportToCSV(feedback, filename);
      } else if (filename.endsWith('.json')) {
        await exportToJSON(feedback, filename);
      } else {
        console.warn('⚠️  Unknown file format. Use .csv or .json');
      }
    }
  } catch (error) {
    console.error('❌ Error querying database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
