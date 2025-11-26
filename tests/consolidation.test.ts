/**
 * Consolidation Test (Phase 2.5)
 *
 * This test verifies that backend API logic has been consolidated under server/api/
 * Following TDD approach: write test for target state, verify it fails, then implement.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('Phase 2.5: Code Consolidation', () => {
  const projectRoot = join(__dirname, '..');

  it('should have moved session-router from lib/api/ to server/api/', async () => {
    // Target: server/api/session-router.ts should exist
    const targetPath = join(projectRoot, 'server/api/session-router.ts');
    expect(existsSync(targetPath), `Expected ${targetPath} to exist`).toBe(true);

    // Target: should be importable from @/server/api/
    const { handleSessionRequest } = await import('@/server/api/session-router');
    expect(typeof handleSessionRequest).toBe('function');
  });

  it('should have moved session-router.test.ts from lib/api/ to server/api/', () => {
    const targetPath = join(projectRoot, 'server/api/session-router.test.ts');
    expect(existsSync(targetPath), `Expected ${targetPath} to exist`).toBe(true);
  });

  it('should have moved llm-handlers from lib/api/ to server/api/', async () => {
    const targetPath = join(projectRoot, 'server/api/llm-handlers.ts');
    expect(existsSync(targetPath), `Expected ${targetPath} to exist`).toBe(true);

    // Target: should be importable from @/server/api/
    const handlers = await import('@/server/api/llm-handlers');
    expect(typeof handlers.handleGenerateScenario).toBe('function');
  });

  it('should have cleaned up lib/api/ directory', () => {
    const libApiPath = join(projectRoot, 'lib/api');

    // If directory doesn't exist, that's perfect (fully cleaned)
    if (!existsSync(libApiPath)) {
      expect(true).toBe(true);
      return;
    }

    // If it exists, it should be empty (or only contain snapshots)
    const entries = readdirSync(libApiPath);
    const nonSnapshotEntries = entries.filter(e => e !== '__snapshots__');

    expect(
      nonSnapshotEntries.length,
      `Expected lib/api/ to be empty but found: ${nonSnapshotEntries.join(', ')}`
    ).toBe(0);
  });

  it('should have removed duplicate lib/prisma.ts', () => {
    const libPrismaPath = join(projectRoot, 'lib/prisma.ts');
    expect(existsSync(libPrismaPath), 'lib/prisma.ts should be deleted (duplicate of server/lib/prisma.ts)').toBe(false);
  });

  it('should have server/lib/prisma.ts as the canonical Prisma client', async () => {
    const serverPrismaPath = join(projectRoot, 'server/lib/prisma.ts');
    expect(existsSync(serverPrismaPath), 'server/lib/prisma.ts should exist').toBe(true);

    const { getPrisma } = await import('@/server/lib/prisma');
    expect(typeof getPrisma).toBe('function');
  });
});
