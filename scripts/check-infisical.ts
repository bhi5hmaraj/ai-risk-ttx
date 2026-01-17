import fs from 'node:fs';
import dotenv from 'dotenv';
import { loadSecrets } from '@/lib/infisical';

// Load local env file if present (preferred), otherwise fall back to default `.env`.
if (fs.existsSync('.env.infiscal')) {
  dotenv.config({ path: '.env.infiscal' });
} else if (fs.existsSync('.env.infisical')) {
  dotenv.config({ path: '.env.infisical' });
} else {
  dotenv.config();
}

function mask(value: string, visible = 6): string {
  if (value.length <= visible) return '*'.repeat(value.length);
  return `${value.slice(0, visible)}…`;
}

async function main(): Promise<void> {
  const token = process.env.INFISICAL_TOKEN;
  const clientId = process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET;
  const environment = process.env.INFISICAL_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const projectId = process.env.INFISICAL_PROJECT_ID || process.env.INFISICAL_WORKSPACE_ID;

  if (!projectId) {
    console.error('[check-infisical] Missing INFISICAL_PROJECT_ID (or legacy INFISICAL_WORKSPACE_ID)');
    process.exit(1);
  }

  if (!token && !(clientId && clientSecret)) {
    console.error('[check-infisical] Provide INFISICAL_TOKEN or INFISICAL_UNIVERSAL_AUTH_CLIENT_ID/SECRET');
    process.exit(1);
  }

  console.log('[check-infisical] Starting');
  console.log(`[check-infisical] environment=${environment}`);
  if (token) console.log(`[check-infisical] token=${mask(token)}`);
  if (clientId) console.log(`[check-infisical] clientId=${mask(clientId)}`);
  console.log(`[check-infisical] projectId=${projectId ? mask(projectId) : '(unset)'}`);

  const before = new Set(Object.keys(process.env));
  await loadSecrets();
  const after = new Set(Object.keys(process.env));

  const injected = [...after].filter((k) => !before.has(k));
  injected.sort();

  const requiredKeys = [
    'DATABASE_URL',
    'LITELLM_API_KEY',
    'LITELLM_BASE_URL',
    'LLM_MODEL',
  ];
  const optionalKeys = [
    'OPENAI_API_KEY',
    'OPENAI_BASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'ADMIN_EMAILS',
    'SENTRY_DSN',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
  ];

  const missingRequired = requiredKeys.filter((k) => !process.env[k]);

  console.log(`[check-infisical] injectedKeys=${injected.length}`);
  for (const key of requiredKeys) {
    console.log(`[check-infisical] required ${key}=${process.env[key] ? 'present' : 'MISSING'}`);
  }
  for (const key of optionalKeys) {
    console.log(`[check-infisical] optional ${key}=${process.env[key] ? 'present' : 'missing'}`);
  }

  if (missingRequired.length > 0) {
    console.error(`[check-infisical] Missing required keys: ${missingRequired.join(', ')}`);
    process.exit(2);
  }

  console.log('[check-infisical] OK');
}

main().catch((err) => {
  console.error('[check-infisical] Failed:', err?.message || err);
  process.exit(3);
});
