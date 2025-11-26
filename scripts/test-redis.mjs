#!/usr/bin/env node
/**
 * Redis integration test runner
 * Loads .env.local before running the Redis integration test
 */

import { config } from 'dotenv';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load .env.local
const result = config({ path: join(rootDir, '.env.local') });

if (result.error) {
  console.error('⚠️  Warning: Could not load .env.local:', result.error.message);
  console.log('   Make sure REDIS_URL is set in your environment.');
}

// Run vitest with the Redis integration test
const vitest = spawn(
  'npx',
  ['vitest', 'run', 'server/stores/sessionStore.redis.integration.test.ts'],
  {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env },
  }
);

vitest.on('exit', (code) => {
  process.exit(code || 0);
});
