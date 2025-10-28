/**
 * Lazy Prisma client loader to avoid type-checking @prisma/client in environments
 * where it is not available or causes TS issues during dev.
 */

let prismaSingleton: any | undefined = (globalThis as any).__PRISMA__;

export function getPrisma() {
  if (prismaSingleton) return prismaSingleton;
  try {
    // Use runtime require to avoid importing types
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient } = require('@prisma/client');
    prismaSingleton = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    (globalThis as any).__PRISMA__ = prismaSingleton;
    return prismaSingleton;
  } catch (err: any) {
    console.warn('[DB] Prisma not available:', err?.message || String(err));
    prismaSingleton = null;
    return prismaSingleton;
  }
}

export const prisma = getPrisma();
