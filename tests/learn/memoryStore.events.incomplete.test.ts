import { describe, it, beforeEach } from 'vitest';
import { MemorySessionStore, type AdvanceStateFn } from '../../server/stores/sessionStore.memory';
import type { GameState } from '../../types/core';

function gs(round = 0): GameState {
  return {
    phase: 1 as any,
    round,
    coreMetric: { name: 'Trust', description: '', value: 100 },
    eventLog: [],
    currentEvent: { headline: 'h', detail: 'd' },
  } as any;
}

/**
 * Learning test: arrange + act are provided. Fill the commented assertions.
 */
describe('Learning: MemorySessionStore event sequence (incomplete asserts)', () => {
  let store: MemorySessionStore;

  beforeEach(() => {
    const advance: AdvanceStateFn = async ({ session, emit }) => {
      const snap = { ...session };
      emit('progress', snap, { stage: 'ai-turn', role: 'AI-1' });
      return { state: { ...session.state, round: session.state.round + 1 } as any };
    };
    store = new MemorySessionStore({ advanceState: advance });
  });

  it('collects update, progress, advance events in order', async () => {
    const created = await store.create({ state: gs(1) });
    const events: any[] = [];
    const unsub = store.subscribe(created.id, (evt) => events.push(evt));

    const s1 = await store.submitActions(created.id, 'human', 1, []);
    await store.advance(created.id, s1.revision);
    unsub();

    // TODO: Fill the expected counts/order
    // expect(events.filter(e => e.type === 'update').length).toBe(/* ? */);
    // expect(events.filter(e => e.type === 'progress').length).toBe(/* ? */);
    // expect(events.some((e, i) => e.type === 'progress' && events[i+1]?.type === 'advance')).toBe(/* ? */);
  });
});

