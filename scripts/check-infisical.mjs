import process from 'node:process';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { InfisicalSDK } from '@infisical/sdk';

// Load local env file if present (preferred), otherwise fall back to default `.env`.
if (fs.existsSync('.env.infiscal')) {
  dotenv.config({ path: '.env.infiscal' });
} else if (fs.existsSync('.env.infisical')) {
  dotenv.config({ path: '.env.infisical' });
} else {
  dotenv.config();
}

function mask(value, visible = 6) {
  if (!value) return '(unset)';
  if (value.length <= visible) return '*'.repeat(value.length);
  return `${value.slice(0, visible)}…`;
}

async function main() {
  const siteUrl = process.env.INFISICAL_SITE_URL || 'https://app.infisical.com';
  const environment = process.env.INFISICAL_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const projectId = process.env.INFISICAL_PROJECT_ID || process.env.INFISICAL_WORKSPACE_ID;

  const token = process.env.INFISICAL_TOKEN;
  const clientId = process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET;

  if (!projectId) {
    console.error('[check-infisical] Missing INFISICAL_PROJECT_ID (or legacy INFISICAL_WORKSPACE_ID)');
    process.exit(1);
  }

  if (!token && !(clientId && clientSecret)) {
    console.error('[check-infisical] Provide INFISICAL_TOKEN or INFISICAL_UNIVERSAL_AUTH_CLIENT_ID/SECRET');
    process.exit(1);
  }

  console.log('[check-infisical] siteUrl=%s', siteUrl);
  console.log('[check-infisical] environment=%s', environment);
  console.log('[check-infisical] projectId=%s', mask(projectId));
  if (token) console.log('[check-infisical] token=%s', mask(token));
  if (clientId) console.log('[check-infisical] clientId=%s', mask(clientId));

  const sdk = new InfisicalSDK({ siteUrl });
  const authed = token
    ? sdk.auth().accessToken(token)
    : await sdk.auth().universalAuth.login({ clientId, clientSecret });

  const secrets = await authed.secrets().listSecretsWithImports({
    environment,
    projectId,
    secretPath: '/',
  });

  console.log('[check-infisical] secrets=%d', secrets?.length || 0);

  const keys = new Set((secrets || []).map((s) => s?.secretKey).filter(Boolean));
  const required = ['DATABASE_URL', 'LITELLM_API_KEY', 'LITELLM_BASE_URL', 'LLM_MODEL'];
  const missing = required.filter((k) => !keys.has(k));

  for (const k of required) {
    console.log('[check-infisical] required %s=%s', k, keys.has(k) ? 'present' : 'missing');
  }

  if (missing.length) {
    console.error('[check-infisical] Missing required keys: %s', missing.join(', '));
    process.exit(2);
  }

  console.log('[check-infisical] OK');
}

main().catch((err) => {
  console.error('[check-infisical] Failed:', err?.message || err);
  process.exit(3);
});
