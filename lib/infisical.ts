/**
 * Infisical Secrets Loader
 *
 * Fetches secrets from Infisical at runtime and injects them into process.env
 * This eliminates the need for .env files and GCP Secret Manager
 *
 * Usage:
 *   import { loadSecrets } from './lib/infisical';
 *   await loadSecrets();
 */

// Dynamic require to avoid hard coupling with SDK versions (optional dependency).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let InfisicalSDKCtor: any | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sdk = require('@infisical/sdk');
  InfisicalSDKCtor = (sdk && (sdk.InfisicalSDK || sdk.default)) || null;
} catch {
  // optional dependency; continue without SDK
  InfisicalSDKCtor = null;
}

interface InfisicalConfig {
  token?: string;
  environment?: string;
  projectId?: string;
  universalAuthClientId?: string;
  universalAuthClientSecret?: string;
  siteUrl?: string;
  cacheTTL?: number; // seconds to cache secrets
}

let secretsCache: Record<string, string> | null = null;
let cacheTimestamp: number = 0;

function mask(value: string, visible = 6): string {
  if (!value) return '(unset)';
  if (value.length <= visible) return '*'.repeat(value.length);
  return `${value.slice(0, visible)}…`;
}

/**
 * Load secrets from Infisical and inject into process.env
 *
 * Priority order:
 * 1. Existing process.env (e.g., from .env.local) - always takes precedence for quick local testing
 * 2. Infisical secrets - fills in missing values
 *
 * This allows .env.local to work for quick iteration while warning about drift
 */
export async function loadSecrets(config?: InfisicalConfig): Promise<void> {
  const {
    token = process.env.INFISICAL_TOKEN,
    environment = process.env.INFISICAL_ENVIRONMENT || process.env.NODE_ENV || 'development',
    projectId = process.env.INFISICAL_PROJECT_ID || process.env.INFISICAL_WORKSPACE_ID,
    universalAuthClientId = process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_ID,
    universalAuthClientSecret = process.env.INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET,
    siteUrl = process.env.INFISICAL_SITE_URL,
    cacheTTL = 300, // 5 minutes default cache
  } = config || {};

  // Count how many secrets we already have (from .env.local)
  const existingSecrets = Object.keys(process.env).filter(key =>
    !key.startsWith('npm_') &&
    !key.startsWith('VERCEL_') &&
    key !== 'PATH' &&
    key !== 'NODE_ENV'
  );

  // Skip if no token (allows fallback to regular env vars)
  if (!token && !(universalAuthClientId && universalAuthClientSecret)) {
    if (existingSecrets.length > 5) {
      console.warn('[Infisical] No Infisical credentials found, using .env.local secrets only');
      console.warn('[Infisical] Tip: Run `bash scripts/check-infisical-drift.sh` to check for drift');
    } else {
      console.warn('[Infisical] No Infisical credentials found and no .env.local detected');
      console.warn('[Infisical] Set INFISICAL_TOKEN or INFISICAL_UNIVERSAL_AUTH_CLIENT_ID/SECRET');
    }
    return;
  }

  // Use cache if still valid
  const now = Date.now();
  if (secretsCache && (now - cacheTimestamp) < cacheTTL * 1000) {
    console.log('[Infisical] Using cached secrets');
    // Don't override existing process.env values
    const newSecrets = { ...secretsCache };
    for (const key in process.env) {
      delete newSecrets[key]; // Don't override what's already there
    }
    Object.assign(process.env, newSecrets);
    return;
  }

  try {
    console.log(`[Infisical] Fetching secrets env=${environment} projectId=${mask(projectId || '')} siteUrl=${siteUrl || 'https://app.infisical.com'}`);
    if (!InfisicalSDKCtor) {
      console.warn('[Infisical] SDK not installed/available; skipping remote fetch');
      return;
    }

    if (!projectId) {
      console.warn('[Infisical] Missing INFISICAL_PROJECT_ID (Infisical "project id" UUID); skipping remote fetch');
      if (process.env.INFISICAL_PROJECT_SLUG) {
        console.warn('[Infisical] Note: INFISICAL_PROJECT_SLUG is not supported by this loader; use INFISICAL_PROJECT_ID instead.');
      }
      return;
    }

    const sdk = new InfisicalSDKCtor({
      siteUrl: siteUrl || 'https://app.infisical.com',
    });

    // Authenticate:
    // - Prefer service token when provided (INFISICAL_TOKEN)
    // - Otherwise use Universal Auth machine identity creds (client id/secret)
    let authed = null;
    if (token) {
      console.log('[Infisical] Auth method=serviceToken');
      authed = sdk.auth().accessToken(token);
    } else {
      const clientIdLen = String(universalAuthClientId || '').trim().length;
      const clientSecretLen = String(universalAuthClientSecret || '').trim().length;
      console.log('[Infisical] Auth method=universalAuth');
      console.log(`[Infisical] UA creds clientIdLen=${clientIdLen} clientSecretLen=${clientSecretLen}`);
      authed = await sdk.auth().universalAuth.login({
        clientId: universalAuthClientId,
        clientSecret: universalAuthClientSecret,
      });
    }

    // List all secrets for the environment (includes imports).
    // Infisical API uses "workspaceId" internally; SDK option name is "projectId".
    const t0 = Date.now();
    const secrets = await authed.secrets().listSecretsWithImports({
      environment,
      projectId,
      secretPath: '/',
    });
    const dt = Date.now() - t0;

    // Convert to key-value pairs
    const secretsMap: Record<string, string> = {};
    for (const secret of secrets || []) {
      if (!secret?.secretKey) continue;
      secretsMap[String(secret.secretKey)] = String(secret.secretValue ?? '');
    }

    // Cache secrets
    secretsCache = secretsMap;
    cacheTimestamp = now;

    // Check for overrides (keys that exist in both .env.local and Infisical)
    const overriddenKeys: string[] = [];
    for (const key in secretsMap) {
      if (process.env[key] && process.env[key] !== secretsMap[key]) {
        overriddenKeys.push(key);
      }
    }

    // Inject into process.env (only keys that don't already exist)
    const injectedKeys: string[] = [];
    for (const [key, value] of Object.entries(secretsMap)) {
      if (!process.env[key]) {
        process.env[key] = value;
        injectedKeys.push(key);
      }
    }

    console.log(`[Infisical] Loaded ${Object.keys(secretsMap).length} secrets from Infisical (${dt}ms)`);
    console.log(`[Infisical] Injected ${injectedKeys.length} new secrets into process.env`);

    if (overriddenKeys.length > 0) {
      console.warn(`[Infisical] ⚠️  ${overriddenKeys.length} secrets overridden by .env.local: ${overriddenKeys.slice(0, 3).join(', ')}${overriddenKeys.length > 3 ? '...' : ''}`);
      console.warn('[Infisical] Tip: Run `bash scripts/check-infisical-drift.sh` to see full drift report');
    }
  } catch (error) {
    console.error('[Infisical] Failed to load secrets:', error);

    // Don't throw - allow app to start with existing env vars
    // This makes the app resilient to Infisical being temporarily unavailable
    if (existingSecrets.length > 5) {
      console.warn('[Infisical] Continuing with .env.local secrets');
    } else {
      console.warn('[Infisical] Continuing with existing environment variables (may be incomplete)');
    }
  }
}

/**
 * Clear secrets cache (useful for testing)
 */
export function clearSecretsCache(): void {
  secretsCache = null;
  cacheTimestamp = 0;
}

/**
 * Get a secret value (fetches from cache or Infisical)
 */
export async function getSecret(key: string, config?: InfisicalConfig): Promise<string | undefined> {
  if (!secretsCache) {
    await loadSecrets(config);
  }
  return process.env[key];
}
