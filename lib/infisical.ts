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

// Dynamic import to avoid hard type coupling with SDK versions.
// Falls back gracefully when the package is not available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let InfisicalClientCtor: any | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LogLevelEnum: any = { Debug: 'debug', Error: 'error' };
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sdk = require('@infisical/sdk');
  InfisicalClientCtor = (sdk && (sdk.InfisicalClient || sdk.default)) || null;
  LogLevelEnum = (sdk && (sdk.LogLevel || LogLevelEnum)) || LogLevelEnum;
} catch {
  // optional dependency; continue without SDK
  InfisicalClientCtor = null;
}

interface InfisicalConfig {
  token?: string;
  environment?: string;
  projectId?: string;
  cacheTTL?: number; // seconds to cache secrets
}

let secretsCache: Record<string, string> | null = null;
let cacheTimestamp: number = 0;

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
    environment = process.env.NODE_ENV || 'development',
    projectId = process.env.INFISICAL_PROJECT_ID,
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
  if (!token) {
    if (existingSecrets.length > 5) {
      console.warn('[Infisical] No INFISICAL_TOKEN found, using .env.local secrets only');
      console.warn('[Infisical] Tip: Run `bash scripts/check-infisical-drift.sh` to check for drift');
    } else {
      console.warn('[Infisical] No INFISICAL_TOKEN found and no .env.local detected');
      console.warn('[Infisical] Add INFISICAL_TOKEN to .env.local or run: infisical login');
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
    console.log(`[Infisical] Fetching secrets for environment: ${environment}`);
    if (!InfisicalClientCtor) {
      console.warn('[Infisical] SDK not installed/available; skipping remote fetch');
      return;
    }

    const client = new InfisicalClientCtor({
      clientSecret: token,
      logLevel: process.env.NODE_ENV === 'development' ? LogLevelEnum.Debug : LogLevelEnum.Error,
    });

    // List all secrets for the environment
    const secrets = await client.listSecrets({
      environment,
      projectId,
      path: '/',
    });

    // Convert to key-value pairs
    const secretsMap: Record<string, string> = {};
    secrets.forEach((secret: any) => {
      secretsMap[secret.secretKey] = secret.secretValue;
    });

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

    console.log(`[Infisical] Loaded ${Object.keys(secretsMap).length} secrets from Infisical`);
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
