#!/usr/bin/env node
// Dev-friendly Prisma Studio that loads .env.local automatically
import { config as loadEnv } from 'dotenv';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const root = process.cwd();
const envLocalPath = path.join(root, '.env.local');

if (!existsSync(envLocalPath)) {
  console.error('[db:studio:dev] .env.local not found at project root');
  process.exit(1);
}

loadEnv({ path: envLocalPath, override: true });

let dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '';
if (!dbUrl) {
  console.error('[db:studio:dev] Neither DIRECT_DATABASE_URL nor DATABASE_URL set in .env.local');
  process.exit(1);
}

dbUrl = dbUrl.trim().replace(/^"|"$/g, '').replace(/\s+/g, ' ').replace('sslmode require', 'sslmode=require');

if (/prisma-data\.net|db\.prisma\.io/.test(dbUrl)) {
  console.error('[db:studio:dev] URL points to Prisma Data Proxy. Studio requires a direct Postgres URL.');
  console.error('Set DIRECT_DATABASE_URL or DATABASE_URL to a direct connection string in .env.local');
  process.exit(1);
}

const child = spawn('npx', ['prisma', 'studio'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: dbUrl },
});

child.on('exit', (code) => process.exit(code ?? 1));

