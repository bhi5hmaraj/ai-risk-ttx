#!/usr/bin/env node
import { spawn, exec } from 'node:child_process';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import readline from 'node:readline';

const execAsync = promisify(exec);

// Save the PORT from command line BEFORE loading .env.local
const commandLinePort = process.env.PORT;

// Load .env.local if it exists (local dev)
// In cloud (GCP), environment variables will come from the environment directly
try {
  const envLocal = join(process.cwd(), '.env.local');
  if (existsSync(envLocal)) {
    loadEnv({ path: envLocal, override: false }); // Don't override existing env vars
    console.log('[dev-colyseus] Loaded .env.local');
  }
} catch (err) {
  // Silently continue - cloud environments don't need .env.local
}

// Resolve port strictly from env (no hardcoded defaults)
// Precedence: CLI PORT -> COLYSEUS_PORT -> PORT
const port = commandLinePort || process.env.COLYSEUS_PORT || process.env.PORT;
if (!port) {
  console.error('[dev-colyseus] No port configured. Set COLYSEUS_PORT or PORT in .env.local, or pass PORT=xxxx');
  process.exit(1);
}
console.log(`[dev-colyseus] Using port: ${port}`);

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
    console.log(`[dev-colyseus] Killed processes on port ${port}`);
    // Wait a bit for port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (err) {
    console.error('[dev-colyseus] Failed to kill processes:', err.message);
    process.exit(1);
  }
}

async function main() {
  const pids = await checkPortInUse(port);

  if (pids) {
    console.log(`[dev-colyseus] Port ${port} is in use by process(es): ${pids.join(', ')}`);
    const answer = await askQuestion(`Kill these processes and continue? (y/n): `);

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      await killProcessesOnPort(port);
    } else {
      console.log('[dev-colyseus] Aborted. Please free up the port manually.');
      process.exit(1);
    }
  }

  console.log(`[dev-colyseus] Starting Colyseus server on port ${port}...`);

  // Enable Colyseus debugging
  const env = {
    ...process.env,
    PORT: port,
    DEBUG: 'colyseus:*'
  };
  const child = spawn('tsx', ['server/index.ts'], { stdio: 'inherit', env });

  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch(err => {
  console.error('[dev-colyseus] Error:', err);
  process.exit(1);
});
