#!/usr/bin/env node
import { spawn, exec } from 'node:child_process';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import readline from 'node:readline';

const execAsync = promisify(exec);

const args = process.argv.slice(2);
const isMock = args.includes('--mock-llm') || args.includes('--mock') || args.includes('--llm-mode=mock');
const enableLogs = args.includes('--logs');
const roundsIdx = args.findIndex((a) => a === '--rounds');
const aiIdx = args.findIndex((a) => a === '--ai' || a === '--ai-players');
const tagIdx = args.findIndex((a) => a === '--tag' || a === '-t');

// Extract log tag if provided
const logTag = tagIdx !== -1 && args[tagIdx + 1] ? args[tagIdx + 1] : null;

// Save the PORT from command line BEFORE loading .env.local
const commandLinePort = process.env.PORT;

// Load .env.local if it exists (local dev)
try {
  const envLocal = join(process.cwd(), '.env.local');
  if (existsSync(envLocal)) {
    loadEnv({ path: envLocal, override: false }); // Don't override existing env vars
    console.log('[dev-monolith] Loaded .env.local');
  }
} catch (err) {
  // Silently continue - cloud environments don't need .env.local
}

// Resolve port strictly from env (no hardcoded defaults)
// Precedence: CLI PORT -> COLYSEUS_PORT -> PORT
const port = commandLinePort || process.env.COLYSEUS_PORT || process.env.PORT;
if (!port) {
  console.error('[dev-monolith] No port configured. Set COLYSEUS_PORT or PORT in .env.local, or pass PORT=xxxx');
  process.exit(1);
}
console.log(`[dev-monolith] Using port: ${port}`);

async function checkPortInUse(port) {
  try {
    // Use fuser to check if port is in use (more portable than lsof)
    const { stdout } = await execAsync(`fuser ${port}/tcp 2>/dev/null || true`);
    const pids = stdout.trim().split(/\s+/).filter(Boolean);
    return pids.length > 0 ? pids : null;
  } catch (err) {
    return null;
  }
}

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function killProcessesOnPort(port) {
  try {
    // Use fuser -k to kill processes on the port (sends SIGKILL by default)
    await execAsync(`fuser -k ${port}/tcp 2>/dev/null || true`);
    console.log(`[dev-monolith] Killed processes on port ${port}`);
    // Wait a bit for port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (err) {
    console.error('[dev-monolith] Failed to kill processes:', err.message);
    process.exit(1);
  }
}

async function main() {
  const pids = await checkPortInUse(port);

  if (pids) {
    console.log(`[dev-monolith] Port ${port} is in use by process(es): ${pids.join(', ')}`);
    const answer = await askQuestion(`Kill these processes and continue? (y/n): `);

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      await killProcessesOnPort(port);
    } else {
      console.log('[dev-monolith] Aborted. Please free up the port manually.');
      process.exit(1);
    }
  }

  console.log(`[dev-monolith] Starting monolith server (Next.js + Colyseus) on port ${port}...`);

  const env = {
    ...process.env,
    PORT: port,
    NODE_ENV: 'development',
  };

  // Add mock LLM mode if requested
  if (isMock) {
    env.LLM_MOCK = '1';
    env.LLM_MODE = 'mock';
    console.log('[dev-monolith] Mock LLM mode enabled');
  }

  // Add logging if requested
  if (enableLogs) {
    env.LOG_TO_FILE = 'true';
    env.NEXT_PUBLIC_LOG_TO_FILE = 'true';

    if (logTag) {
      env.LOG_TAG = logTag;
      env.NEXT_PUBLIC_LOG_TAG = logTag;
      console.log(`[dev-monolith] File logging enabled with tag: ${logTag}`);
    } else {
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(now.getTime() + istOffset);
      const timestamp = istDate.toISOString().replace(/:/g, '-').split('.')[0];
      env.LOG_TAG = timestamp;
      env.NEXT_PUBLIC_LOG_TAG = timestamp;
      console.log(`[dev-monolith] File logging enabled with auto-tag (IST): ${timestamp}`);
    }
  }

  // Add game config if provided
  if (roundsIdx !== -1 && args[roundsIdx + 1]) {
    const v = String(args[roundsIdx + 1]);
    env.GAME_MAX_ROUNDS = v;
    env.NEXT_PUBLIC_GAME_MAX_ROUNDS = v;
    console.log(`[dev-monolith] MAX_ROUNDS set to ${v}`);
  }

  if (aiIdx !== -1 && args[aiIdx + 1]) {
    const v = String(args[aiIdx + 1]);
    env.GAME_AI_PLAYERS = v;
    env.NEXT_PUBLIC_GAME_AI_PLAYERS = v;
    console.log(`[dev-monolith] MAX_AI_PLAYERS set to ${v}`);
  }

  // Set Colyseus URLs for browser
  if (!env.NEXT_PUBLIC_COLYSEUS_URL) {
    env.NEXT_PUBLIC_COLYSEUS_URL = `ws://localhost:${port}`;
  }
  if (!env.NEXT_PUBLIC_COLYSEUS_HTTP_BASE) {
    env.NEXT_PUBLIC_COLYSEUS_HTTP_BASE = `http://localhost:${port}`;
  }
  if (!env.NEXT_PUBLIC_APP_URL) {
    env.NEXT_PUBLIC_APP_URL = `http://localhost:${port}`;
  }

  console.log(`[dev-monolith] Colyseus WebSocket URL: ${env.NEXT_PUBLIC_COLYSEUS_URL}`);
  console.log(`[dev-monolith] Colyseus HTTP Base: ${env.NEXT_PUBLIC_COLYSEUS_HTTP_BASE}`);
  console.log(`[dev-monolith] App URL: ${env.NEXT_PUBLIC_APP_URL}`);

  // Spawn monolith server (runs server/index.ts which includes Next.js)
  const child = spawn('tsx', ['server/index.ts'], {
    stdio: 'inherit',
    env
  });

  child.on('exit', (code) => {
    console.log(`[dev-monolith] Server exited with code ${code}`);
    process.exit(code ?? 0);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('[dev-monolith] SIGINT received. Shutting down...');
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log('[dev-monolith] SIGTERM received. Shutting down...');
    child.kill('SIGTERM');
  });
}

main().catch(err => {
  console.error('[dev-monolith] Error:', err);
  process.exit(1);
});
