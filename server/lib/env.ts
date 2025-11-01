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
  if (!process.env.DATABASE_URL && process.env.PRISMA_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.PRISMA_DATABASE_URL;
  }
}

export function requireLLMEnv() {
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
  if (missing.length === 0) return null;
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

