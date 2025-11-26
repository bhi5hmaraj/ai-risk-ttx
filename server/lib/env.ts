import { NextResponse } from 'next/server';

// Centralized environment validation helpers for API routes

type GuardKind = 'llm' | 'db';

const REQUIRED: Record<GuardKind, string[]> = {
  llm: ['LITELLM_API_KEY'],
  db: ['DATABASE_URL'],
};

function missingKeys(keys: string[]): string[] {
  return keys.filter((k) => {
    const v = process.env[k];
    return !v || String(v).trim() === '';
  });
}

function noStoreHeaders() {
  return {
    'cache-control': 'no-store, max-age=0',
  } as Record<string, string>;
}

/**
 * Normalize DATABASE_URL when only PRISMA_DATABASE_URL is set (common on Vercel).
 */
function normalizeDatabaseUrl() {
  // Prefer explicit DATABASE_URL; otherwise fall back to common alternates
  if (!process.env.DATABASE_URL) {
    if (process.env.DIRECT_DATABASE_URL) {
      process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
      try { console.log('[env] Using DIRECT_DATABASE_URL for DATABASE_URL'); } catch {}
      return;
    }
    if (process.env.PRISMA_DATABASE_URL) {
      process.env.DATABASE_URL = process.env.PRISMA_DATABASE_URL;
      try { console.log('[env] Using PRISMA_DATABASE_URL for DATABASE_URL'); } catch {}
      return;
    }
  }
}

function redactDbUrl(url: string | undefined) {
  if (!url) return '<unset>';
  try {
    const u = new URL(url);
    const user = u.username || 'user';
    const host = u.hostname || 'host';
    const port = u.port ? `:${u.port}` : '';
    const db = u.pathname || '';
    return `${u.protocol}//${user}@${host}${port}${db}`;
  } catch {
    // Fallback: avoid leaking secrets, show only scheme and host-ish prefix
    const m = String(url).match(/^(.*?:)\/\/(.*?)(?:\?|$)/);
    return m ? `${m[1]}//${m[2]}` : '<redacted>';
  }
}

function isMockLLM() {
  return (process.env.LLM_MOCK === '1') || (process.env.LLM_MODE === 'mock');
}

export function requireLLMEnv() {
  // In mock mode we intentionally do not require real credentials
  if (isMockLLM()) return null;
  const missing = missingKeys(REQUIRED.llm);
  if (missing.length === 0) return null;
  return NextResponse.json(
    {
      success: false,
      error: 'Server misconfigured: missing required environment variables',
      service: 'llm',
      missing,
    },
    { status: 503, headers: noStoreHeaders() }
  );
}

export function requireDBEnv() {
  normalizeDatabaseUrl();
  const missing = missingKeys(REQUIRED.db);
  if (missing.length === 0) {
    try {
      // Light log to help diagnose env mismatches without exposing secrets
      // Note: Next caches env at boot; restart dev server after changing .env.local
      console.log('[env] DATABASE_URL OK:', redactDbUrl(process.env.DATABASE_URL));
    } catch {}
    return null;
  }
  try {
    console.warn('[env] DATABASE_URL missing; NODE_ENV=', process.env.NODE_ENV, {
      has_DATABASE_URL: !!process.env.DATABASE_URL,
      has_PRISMA_DATABASE_URL: !!process.env.PRISMA_DATABASE_URL,
    });
  } catch {}
  return NextResponse.json(
    {
      success: false,
      error: 'Server misconfigured: missing required environment variables',
      service: 'database',
      missing,
    },
    { status: 503, headers: noStoreHeaders() }
  );
}
