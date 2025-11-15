import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.__prisma__ || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma__ = prisma;
}

// Backwards-compatible helper used by existing routes/CLIs
export function getPrisma(): PrismaClient {
  return prisma;
}

export default prisma;

// Log minimal DB info once to help diagnose env mismatches
try {
  const url = process.env.DATABASE_URL;
  if (url) {
    const u = new URL(url);
    const summary = `${u.protocol}//${u.username || 'user'}@${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}`;
    console.log('[prisma] Client initialized against', summary);
  } else {
    console.warn('[prisma] DATABASE_URL is not set at import time');
  }
} catch {
  console.warn('[prisma] Unable to parse DATABASE_URL for logging');
}
