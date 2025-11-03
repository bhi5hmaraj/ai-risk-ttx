import { describe, it, expect } from 'vitest';
import { MemorySessionStore, type AdvanceStateFn } from '../server/stores/sessionStore.memory';
import type { GameState } from '../types/core';

function gs(round = 0): GameState {
  return {
    phase: 1 as any, // STARTING/ACTION not important here
    round,
    coreMetric: { name: 'Trust', description: '', value: 100 },
    eventLog: [],
    currentEvent: { headline: 'h', detail: 'd' },
  } as any;
}

describe('MemorySessionStore progress events', () => {
  it('emits progress with payload during advance', async () => {
    const advance: AdvanceStateFn = async ({ session, emit }) => {
      const snap = { ...session };
      emit('progress', snap, { stage: 'ai-turn', role: 'AI-1' });
      emit('progress', snap, { stage: 'ai-turn', role: 'AI-2' });
      return { state: { ...session.state, round: session.state.round + 1 } as any };
    };
    const store = new MemorySessionStore({ advanceState: advance });
    const created = await store.create({ state: gs(1) });
    const events: any[] = [];
    const unsub = store.subscribe(created.id, (evt) => events.push(evt));
    const s1 = await store.submitActions(created.id, 'human', 1, []);
    await store.advance(created.id, s1.revision);
    unsub();

    const progress = events.filter((e) => e.type === 'progress');
    expect(progress.length).toBe(2);
    expect(progress[0].payload?.role).toBe('AI-1');
    expect(progress[1].payload?.role).toBe('AI-2');
    const advanceEvt = events.find((e) => e.type === 'advance');
    expect(advanceEvt).toBeTruthy();
  });
});

