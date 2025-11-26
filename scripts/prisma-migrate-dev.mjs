#!/usr/bin/env node
// Dev-friendly Prisma migrate that loads .env.local automatically
import { config as loadEnv } from 'dotenv';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

const root = process.cwd();
const envLocalPath = path.join(root, '.env.local');

if (!existsSync(envLocalPath)) {
  console.error('[db:migrate:dev] .env.local not found at project root');
  process.exit(1);
}

loadEnv({ path: envLocalPath, override: true });

let dbUrl = process.env.DATABASE_URL || '';

if (!dbUrl) {
  console.error('[db:migrate:dev] DATABASE_URL not set in .env.local');
  process.exit(1);
}

// Sanitize common formatting issues (quotes/spaces, sslmode require → sslmode=require)
dbUrl = dbUrl.trim().replace(/^"|"$/g, '').replace(/\s+/g, ' ').replace('sslmode require', 'sslmode=require');

// Basic guard: Prisma Accelerate/Data Proxy URLs are not supported for migrate
if (/prisma-data\.net|db\.prisma\.io/.test(dbUrl)) {
  console.error('[db:migrate:dev] DATABASE_URL points to Prisma Data Proxy. Migrate requires a direct Postgres URL.');
  console.error('Set DATABASE_URL to a direct connection string (e.g., POSTGRES_URL_NON_POOLING) in .env.local');
  process.exit(1);
}

// Spawn prisma migrate dev with env overridden
const child = spawn('npx', ['prisma', 'migrate', 'dev'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: dbUrl },
});

child.on('exit', (code) => process.exit(code ?? 1));

