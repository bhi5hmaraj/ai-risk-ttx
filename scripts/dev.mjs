#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { config as loadEnv } from 'dotenv';
import { existsSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const isMock = args.includes('--mock-llm') || args.includes('--mock') || args.includes('--llm-mode=mock');
const enableLogs = args.includes('--logs');
const roundsIdx = args.findIndex((a) => a === '--rounds');
const aiIdx = args.findIndex((a) => a === '--ai' || a === '--ai-players');
const backendIdx = args.findIndex((a) => a === '--backend' || a === '--backend-state');
const tagIdx = args.findIndex((a) => a === '--tag' || a === '-t');

// Extract log tag if provided
const logTag = tagIdx !== -1 && args[tagIdx + 1] ? args[tagIdx + 1] : null;

// Strip our custom flags before forwarding to Next.js
const forward = args.filter((a, i) => {
  if (a === '--mock-llm' || a === '--mock' || a === '--llm-mode=mock') return false;
  if (a === '--logs') return false;
  if (i === tagIdx || i === tagIdx + 1) return false;
  if (i === roundsIdx || i === roundsIdx + 1) return false;
  if (i === aiIdx || i === aiIdx + 1) return false;
  if (i === backendIdx) return false;
  return true;
});

// Ensure Next.js process sees env from .env.local at boot
try {
  const envLocal = join(process.cwd(), '.env.local');
  if (existsSync(envLocal)) {
    loadEnv({ path: envLocal, override: true });
    console.log('[dev] Loaded .env.local');
  }
} catch {}

const env = { ...process.env };
if (isMock) {
  env.LLM_MOCK = '1';
  env.LLM_MODE = 'mock';
  console.log('[dev] Mock LLM mode enabled');
}

if (enableLogs) {
  env.LOG_TO_FILE = 'true';
  env.NEXT_PUBLIC_LOG_TO_FILE = 'true';

  // Pass log tag to loggers
  if (logTag) {
    env.LOG_TAG = logTag;
    env.NEXT_PUBLIC_LOG_TAG = logTag;
    console.log(`[dev] File logging enabled with tag: ${logTag}`);
  } else {
    // Generate default timestamp-based tag in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istDate = new Date(now.getTime() + istOffset);
    const timestamp = istDate.toISOString().replace(/:/g, '-').split('.')[0]; // YYYY-MM-DDTHH-MM-SS
    env.LOG_TAG = timestamp;
    env.NEXT_PUBLIC_LOG_TAG = timestamp;
    console.log(`[dev] File logging enabled with auto-tag (IST): ${timestamp}`);
  }
}

if (roundsIdx !== -1 && args[roundsIdx + 1]) {
  const v = String(args[roundsIdx + 1]);
  env.GAME_MAX_ROUNDS = v;
  env.NEXT_PUBLIC_GAME_MAX_ROUNDS = v;
  console.log(`[dev] MAX_ROUNDS set to ${v}`);
}

if (aiIdx !== -1 && args[aiIdx + 1]) {
  const v = String(args[aiIdx + 1]);
  env.GAME_AI_PLAYERS = v;
  env.NEXT_PUBLIC_GAME_AI_PLAYERS = v;
  console.log(`[dev] MAX_AI_PLAYERS set to ${v}`);
}

if (backendIdx !== -1) {
  // Server-authoritative mode is always on now; no flag needed.
}

// Derive browser WS URL from COLYSEUS_PORT if not explicitly provided
if (!env.NEXT_PUBLIC_COLYSEUS_URL && env.COLYSEUS_PORT) {
  env.NEXT_PUBLIC_COLYSEUS_URL = `ws://localhost:${env.COLYSEUS_PORT}`;
  console.log(`[dev] Colyseus URL: ${env.NEXT_PUBLIC_COLYSEUS_URL}`);
}

// Validate required ports from env (no hardcoded defaults)
const nextDevPort = env.NEXT_DEV_PORT;
const colyseusPort = env.COLYSEUS_PORT || env.PORT;

if (!nextDevPort) {
  console.error('[dev] NEXT_DEV_PORT is not set. Add it to .env.local');
  process.exit(1);
}
if (!colyseusPort) {
  console.error('[dev] COLYSEUS_PORT (or PORT) is not set. Add it to .env.local');
  process.exit(1);
}

// Spawn Next dev server
const nextArgs = ['dev', '-p', nextDevPort, ...forward];
console.log(`[dev] Starting Next (UI) on :${nextDevPort} ...`);
const nextProc = spawn('next', nextArgs, { stdio: 'inherit', env });

// Spawn Colyseus server via helper (handles port-in-use prompt)
console.log(`[dev] Starting Colyseus on :${colyseusPort} ...`);
const colyseusProc = spawn('node', ['scripts/dev-colyseus.mjs'], { stdio: 'inherit', env });

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`[dev] Caught ${signal}. Shutting down...`);
  if (colyseusProc && !colyseusProc.killed) colyseusProc.kill('SIGINT');
  if (nextProc && !nextProc.killed) nextProc.kill('SIGINT');
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// If either child exits, exit this orchestrator
nextProc.on('exit', (code) => {
  console.log(`[dev] Next exited with code ${code}`);
  if (colyseusProc && !colyseusProc.killed) colyseusProc.kill('SIGINT');
  process.exit(code ?? 0);
});
colyseusProc.on('exit', (code) => {
  console.log(`[dev] Colyseus exited with code ${code}`);
  if (nextProc && !nextProc.killed) nextProc.kill('SIGINT');
  process.exit(code ?? 0);
});

// Print ready URLs (best-effort; services will log their own readiness)
(async () => {
  await sleep(500);
  const frontendUrl = `http://localhost:${nextDevPort}`;
  const adminUrl = `http://localhost:${colyseusPort}/colyseus-admin`;
  const healthUrl = `http://localhost:${colyseusPort}/healthz`;
  console.log('\n[dev] --------------------------------------------------');
  console.log(`[dev] Frontend:        ${frontendUrl}`);
  console.log(`[dev] Colyseus Admin:  ${adminUrl}`);
  console.log(`[dev] Colyseus Health: ${healthUrl}`);
  console.log('[dev] --------------------------------------------------\n');
})();
