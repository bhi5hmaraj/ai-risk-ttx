import { describe, it, expect } from 'vitest';
import { MemorySessionStore } from '../../server/stores/sessionStore.memory';
import { RevisionConflictError } from '../../server/stores/sessionStore';

describe('Learning: Revision conflict path (incomplete assert)', () => {
  it('throws a RevisionConflictError when revision mismatches', async () => {
    const store = new MemorySessionStore({
      advanceState: async ({ session }) => ({ state: { ...session.state, round: session.state.round + 1 } as any }),
    });
    const created = await store.create({ state: { round: 1 } as any });

    let caught: unknown;
    try {
      // Act: incorrect expected revision (0 instead of 1)
      await store.update(created.id, 0, (s) => s);
    } catch (err) {
      caught = err;
    }

    // TODO: Fill expected check(s)
    // expect(caught instanceof RevisionConflictError).toBe(/* true */);
    // expect((caught as RevisionConflictError).latest?.revision).toBe(/* created.revision */);
  });
});

