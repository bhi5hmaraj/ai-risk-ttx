#!/usr/bin/env node
import fs from 'node:fs';
import dotenv from 'dotenv';
import { spawn } from 'node:child_process';
import { InfisicalSDK } from '@infisical/sdk';

process.env.DOTENV_CONFIG_QUIET = 'true';

// Load local Infisical env file (ignored by git) when present.
// In CI/Cloud Build you can provide the INFISICAL_* env vars directly.
if (fs.existsSync('.env.infiscal')) {
  dotenv.config({ path: '.env.infiscal' });
} else if (fs.existsSync('.env.infisical')) {
  dotenv.config({ path: '.env.infisical' });
}

function redactDbUrl(url) {
  if (!url) return '<unset>';
  try {
    const u = new URL(url);
    const user = u.username || 'user';
    const host = u.hostname || 'host';
    const port = u.port ? `:${u.port}` : '';
    const db = (u.pathname || '').replace(/^\//, '');
    return `${u.protocol}//${user}@${host}${port}/${db}`;
  } catch {
    return '<redacted>';
  }
}

async function main() {
  const siteUrl = process.env.INFISICAL_SITE_URL || 'https://app.infisical.com';
  const environment = (process.env.INFISICAL_ENVIRONMENT || process.env.NODE_ENV || 'dev').trim();
  const projectId = (process.env.INFISICAL_PROJECT_ID || process.env.INFISICAL_WORKSPACE_ID || '').trim();

  const token = (process.env.INFISICAL_TOKEN || '').trim();
  const clientId = (process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET || '').trim();

  if (!projectId) {
    console.error('[db:migrate:infisical] Missing INFISICAL_PROJECT_ID');
    process.exit(1);
  }
  if (!token && !(clientId && clientSecret)) {
    console.error('[db:migrate:infisical] Provide INFISICAL_TOKEN or INFISICAL_UNIVERSAL_AUTH_CLIENT_ID/SECRET');
    process.exit(1);
  }

  console.log(`[db:migrate:infisical] Fetching DATABASE_URL env=${environment} projectId=${projectId.slice(0, 6)}…`);

  const sdk = new InfisicalSDK({ siteUrl });
  const authed = token
    ? sdk.auth().accessToken(token)
    : await sdk.auth().universalAuth.login({ clientId, clientSecret });

  const secrets = await authed.secrets().listSecretsWithImports({
    environment,
    projectId,
    secretPath: '/',
  });

  const dbSecret = (secrets || []).find((s) => s?.secretKey === 'DATABASE_URL');
  const dbUrlRaw = String(dbSecret?.secretValue || '').trim().replace(/^"|"$/g, '');

  if (!dbUrlRaw) {
    console.error('[db:migrate:infisical] DATABASE_URL not found in Infisical for this environment');
    process.exit(1);
  }

  // Prisma migrate deploy prefers a direct Postgres URL; Neon pooler URLs can work but may be flaky.
  if (/-pooler\\./.test(dbUrlRaw)) {
    console.warn('[db:migrate:infisical] Warning: DATABASE_URL appears to be a Neon pooler URL; migrations may fail. Consider using a non-pooler URL for migrations.');
  }

  console.log('[db:migrate:infisical] Running prisma migrate deploy against:', redactDbUrl(dbUrlRaw));

  const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrlRaw },
  });
  child.on('exit', (code) => process.exit(code ?? 1));
}

main().catch((err) => {
  console.error('[db:migrate:infisical] Failed:', err?.message || err);
  process.exit(2);
});
