#!/usr/bin/env node
/**
 * Debug helper for Prisma env resolution.
 *
 * Usage examples:
 *   node scripts/prisma-env-debug.mjs .env.preview.local
 *   PRISMA_IGNORE_ENV_FILE=1 node scripts/prisma-env-debug.mjs .env.preview.local --migrate
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

function clean(val) {
  if (val == null) return val;
  let v = String(val);
  // Strip surrounding quotes if present
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  // Remove literal CR and a single trailing literal \n escape
  v = v.replace(/\r$/g, '');
  v = v.replace(/\\n$/g, '');
  // Trim whitespace
  v = v.trim();
  return v;
}

function redact(v) {
  if (!v) return String(v);
  const s = String(v);
  if (s.length <= 16) return '[redacted:' + s.length + ' chars]';
  return s.slice(0, 12) + '…' + s.slice(-6);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/prisma-env-debug.mjs <envfile> [--migrate|--validate]');
  process.exit(2);
}
const envFile = path.resolve(args[0]);
const doMigrate = args.includes('--migrate');
const doValidate = args.includes('--validate');

if (!fs.existsSync(envFile)) {
  console.error(`Env file not found: ${envFile}`);
  process.exit(2);
}

const raw = fs.readFileSync(envFile, 'utf8');
const parsed = dotenv.parse(raw);

let dbUrl = clean(parsed.DATABASE_URL ?? process.env.DATABASE_URL);
let directUrl = clean(parsed.DIRECT_DATABASE_URL ?? process.env.DIRECT_DATABASE_URL ?? dbUrl);

console.log('[debug] Loaded env file:', envFile);
console.log('[debug] Raw keys present:', Object.keys(parsed).length);
console.log('[debug] DATABASE_URL len:', dbUrl ? dbUrl.length : 0, 'value:', redact(dbUrl));
console.log('[debug] DIRECT_DATABASE_URL len:', directUrl ? directUrl.length : 0, 'value:', redact(directUrl));

if (!dbUrl) {
  console.error('[error] DATABASE_URL is empty after cleaning. Check for stray quotes or newline escapes (\\n)');
  process.exit(1);
}

const childEnv = { ...process.env, DATABASE_URL: dbUrl, DIRECT_DATABASE_URL: directUrl, PRISMA_IGNORE_ENV_FILE: '1' };

if (doValidate) {
  console.log('[debug] Running: prisma validate');
  const res = spawnSync('npx', ['prisma', 'validate'], { stdio: 'inherit', env: childEnv });
  process.exit(res.status ?? 0);
}

if (doMigrate) {
  console.log('[debug] Running: prisma migrate deploy');
  const res = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit', env: childEnv });
  process.exit(res.status ?? 0);
}

console.log('[debug] Dry run complete. Use --validate or --migrate to execute Prisma with these envs.');

