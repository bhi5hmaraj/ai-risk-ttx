#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const isMock = args.includes('--mock-llm') || args.includes('--mock') || args.includes('--llm-mode=mock');
const roundsIdx = args.findIndex((a) => a === '--rounds');
const aiIdx = args.findIndex((a) => a === '--ai' || a === '--ai-players');
const backendIdx = args.findIndex((a) => a === '--backend' || a === '--backend-state');

// Strip our custom flags before forwarding to Next.js
const forward = args.filter((a, i) => {
  if (a === '--mock-llm' || a === '--mock' || a === '--llm-mode=mock') return false;
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

const child = spawn('next', ['dev', ...forward], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
