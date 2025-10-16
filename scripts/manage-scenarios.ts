#!/usr/bin/env tsx

/**
 * Crisis Command - Scenario Management CLI
 *
 * Query and manage public scenario submissions
 *
 * Usage:
 *   npm run scenarios                           # List all pending scenarios (local DB)
 *   npm run scenarios -- --env preview          # Query preview database
 *   npm run scenarios -- --env production       # Query production database
 *   npm run scenarios -- --status approved      # List approved scenarios
 *   npm run scenarios -- --status rejected      # List rejected scenarios
 *   npm run scenarios -- --approve <id>         # Approve a scenario
 *   npm run scenarios -- --reject <id> "reason" # Reject with reason
 *   npm run scenarios -- --view <id>            # View scenario details
 *   npm run scenarios -- --help                 # Show all options
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

interface ManageOptions {
  env?: 'local' | 'preview' | 'production';
  status?: 'pending' | 'approved' | 'rejected';
  approve?: string;
  reject?: string;
  rejectionReason?: string;
  view?: string;
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

  // For preview/production, use Prisma Accelerate URL
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

let prisma: PrismaClient;

// Parse command line arguments
function parseArgs(): ManageOptions {
  const args = process.argv.slice(2);
  const options: ManageOptions = {};

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
      case '--status':
      case '-s':
        const status = args[++i];
        if (status === 'pending' || status === 'approved' || status === 'rejected') {
          options.status = status;
        } else {
          console.error(`❌ Invalid status: ${status}`);
          console.error('   Valid options: pending, approved, rejected');
          process.exit(1);
        }
        break;
      case '--approve':
      case '-a':
        options.approve = args[++i];
        break;
      case '--reject':
      case '-r':
        options.reject = args[++i];
        options.rejectionReason = args[++i];
        if (!options.rejectionReason) {
          console.error('❌ Rejection reason is required when rejecting a scenario');
          process.exit(1);
        }
        break;
      case '--view':
      case '-v':
        options.view = args[++i];
        break;
      case '--limit':
      case '-l':
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
📊 Crisis Command - Scenario Management CLI

USAGE:
  npm run scenarios [OPTIONS]

OPTIONS:
  --env, -e <env>           Environment: local, preview, or production (default: local)
  --status, -s <status>     Filter by status: pending, approved, or rejected (default: pending)
  --approve, -a <id>        Approve a scenario by ID
  --reject, -r <id> <reason> Reject a scenario with reason
  --view, -v <id>           View detailed scenario information
  --limit, -l <number>      Limit number of results (default: 50)
  --help, -h                Show this help message

EXAMPLES:
  # List all pending scenarios from local database
  npm run scenarios

  # List pending scenarios from production
  npm run scenarios -- --env production

  # List approved scenarios
  npm run scenarios -- --status approved

  # View a specific scenario
  npm run scenarios -- --view clxyz123

  # Approve a scenario (local)
  npm run scenarios -- --approve clxyz123

  # Approve a scenario in production
  npm run scenarios -- --env production --approve clxyz123

  # Reject a scenario with reason
  npm run scenarios -- --reject clxyz123 "Contains inappropriate content"

  # List rejected scenarios from preview
  npm run scenarios -- --env preview --status rejected
`);
}

async function listScenarios(options: ManageOptions) {
  const status = options.status || 'pending';
  const limit = options.limit || 50;

  console.log(`🔍 Fetching ${status} scenarios...\n`);

  try {
    const scenarios = await prisma.publicScenario.findMany({
      where: { status },
      orderBy: { submittedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        customPrompt: true,
        submitterName: true,
        submittedAt: true,
        reviewedAt: true,
        reviewedBy: true,
        rejectionReason: true,
        voteCount: true,
        gameSetup: true,
      },
    });

    if (scenarios.length === 0) {
      console.log(`📭 No ${status} scenarios found.`);
      return;
    }

    console.log(`Found ${scenarios.length} ${status} scenario(s):\n`);

    for (const scenario of scenarios) {
      const gameSetup = scenario.gameSetup as any;

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`ID: ${scenario.id}`);
      console.log(`Status: ${status.toUpperCase()}`);
      console.log(`Submitted: ${new Date(scenario.submittedAt).toLocaleString()}`);
      console.log(`Submitter: ${scenario.submitterName || 'Anonymous'}`);
      console.log(`Votes: ${scenario.voteCount}`);
      console.log(`\nScenario Title: ${gameSetup?.scenarioTitle || 'N/A'}`);
      console.log(`\nPrompt (first 200 chars):\n"${scenario.customPrompt.substring(0, 200)}${scenario.customPrompt.length > 200 ? '...' : ''}"`);

      if (scenario.reviewedAt) {
        console.log(`\nReviewed: ${new Date(scenario.reviewedAt).toLocaleString()}`);
        console.log(`Reviewed By: ${scenario.reviewedBy || 'N/A'}`);
      }

      if (scenario.rejectionReason) {
        console.log(`\nRejection Reason: "${scenario.rejectionReason}"`);
      }

      console.log(`\nTo view full details: npm run scenarios -- --view ${scenario.id}`);
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error fetching scenarios:', error);
    process.exit(1);
  }
}

async function viewScenario(id: string) {
  console.log(`🔍 Fetching scenario ${id}...\n`);

  try {
    const scenario = await prisma.publicScenario.findUnique({
      where: { id },
      include: {
        votes: {
          select: {
            userFingerprint: true,
            createdAt: true,
          },
          take: 10,
        },
      },
    });

    if (!scenario) {
      console.error(`❌ Scenario not found: ${id}`);
      process.exit(1);
    }

    const gameSetup = scenario.gameSetup as any;
    const initialEvent = scenario.initialEvent as any;

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 SCENARIO DETAILS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    console.log(`ID: ${scenario.id}`);
    console.log(`Status: ${scenario.status.toUpperCase()}`);
    console.log(`Submitted: ${new Date(scenario.submittedAt).toLocaleString()}`);
    console.log(`Submitter: ${scenario.submitterName || 'Anonymous'}`);
    console.log(`Votes: ${scenario.voteCount}`);

    if (scenario.reviewedAt) {
      console.log(`\nReviewed: ${new Date(scenario.reviewedAt).toLocaleString()}`);
      console.log(`Reviewed By: ${scenario.reviewedBy || 'N/A'}`);
    }

    if (scenario.rejectionReason) {
      console.log(`\nRejection Reason:\n"${scenario.rejectionReason}"`);
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📝 CUSTOM PROMPT`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    console.log(scenario.customPrompt);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎮 GAME SETUP`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    console.log(`Scenario Title: ${gameSetup?.scenarioTitle || 'N/A'}`);
    console.log(`\nScenario Description:\n${gameSetup?.scenarioDescription || 'N/A'}`);

    if (gameSetup?.coreMetric) {
      console.log(`\nCore Metric: ${gameSetup.coreMetric.name}`);
      console.log(`Description: ${gameSetup.coreMetric.description}`);
      console.log(`Initial Value: ${gameSetup.coreMetric.initialValue}`);
    }

    if (gameSetup?.stakeholders) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👥 STAKEHOLDERS (${gameSetup.stakeholders.length})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      gameSetup.stakeholders.forEach((stakeholder: any, index: number) => {
        console.log(`${index + 1}. ${stakeholder.name}`);
        console.log(`   Public Objective: ${stakeholder.publicObjective}`);
        console.log(`   Hidden Objective: ${stakeholder.hiddenObjective}`);
        if (stakeholder.resources?.length > 0) {
          console.log(`   Resources: ${stakeholder.resources.join(', ')}`);
        }
        if (stakeholder.constraints?.length > 0) {
          console.log(`   Constraints: ${stakeholder.constraints.join(', ')}`);
        }
        console.log('');
      });
    }

    if (initialEvent) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📰 INITIAL EVENT`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      console.log(`Headline: ${initialEvent.headline || 'N/A'}`);
      console.log(`\nDetail:\n${initialEvent.detail || 'N/A'}`);
    }

    if (scenario.votes.length > 0) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👍 RECENT VOTES (showing ${scenario.votes.length} of ${scenario.voteCount})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      scenario.votes.forEach((vote) => {
        console.log(`  ${vote.userFingerprint.substring(0, 16)}... - ${new Date(vote.createdAt).toLocaleString()}`);
      });
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    if (scenario.status === 'pending') {
      console.log(`💡 ACTIONS:`);
      console.log(`   Approve: npm run scenarios -- --approve ${id}`);
      console.log(`   Reject:  npm run scenarios -- --reject ${id} "Your reason here"`);
    }
  } catch (error) {
    console.error('❌ Error fetching scenario:', error);
    process.exit(1);
  }
}

async function approveScenario(id: string) {
  console.log(`✅ Approving scenario ${id}...\n`);

  try {
    const scenario = await prisma.publicScenario.findUnique({
      where: { id },
      select: { id: true, status: true, customPrompt: true },
    });

    if (!scenario) {
      console.error(`❌ Scenario not found: ${id}`);
      process.exit(1);
    }

    if (scenario.status === 'approved') {
      console.warn(`⚠️  Scenario is already approved`);
      return;
    }

    await prisma.publicScenario.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: process.env.USER || 'admin',
        rejectionReason: null,
      },
    });

    console.log(`✅ Scenario approved successfully!`);
    console.log(`   Prompt: "${scenario.customPrompt.substring(0, 100)}..."`);
  } catch (error) {
    console.error('❌ Error approving scenario:', error);
    process.exit(1);
  }
}

async function rejectScenario(id: string, reason: string) {
  console.log(`❌ Rejecting scenario ${id}...\n`);

  try {
    const scenario = await prisma.publicScenario.findUnique({
      where: { id },
      select: { id: true, status: true, customPrompt: true },
    });

    if (!scenario) {
      console.error(`❌ Scenario not found: ${id}`);
      process.exit(1);
    }

    if (scenario.status === 'rejected') {
      console.warn(`⚠️  Scenario is already rejected`);
      return;
    }

    await prisma.publicScenario.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: process.env.USER || 'admin',
        rejectionReason: reason,
      },
    });

    console.log(`❌ Scenario rejected successfully!`);
    console.log(`   Prompt: "${scenario.customPrompt.substring(0, 100)}..."`);
    console.log(`   Reason: "${reason}"`);
  } catch (error) {
    console.error('❌ Error rejecting scenario:', error);
    process.exit(1);
  }
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

  try {
    if (options.approve) {
      await approveScenario(options.approve);
    } else if (options.reject && options.rejectionReason) {
      await rejectScenario(options.reject, options.rejectionReason);
    } else if (options.view) {
      await viewScenario(options.view);
    } else {
      await listScenarios(options);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
