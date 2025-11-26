import { describe, it, expect } from 'vitest';
import { createValidGameState, createActionOption } from '../../tests/fixtures/session-data';
import type { GameState } from '../../types/core';

import { MemorySessionStore } from './sessionStore.memory';
import { RevisionConflictError } from './sessionStore';

function gsLobby(): GameState {
  const base = createValidGameState();
  return { ...base, phase: 0 as any, round: 0 };
}

function makeStore() {
  return new MemorySessionStore({
    advanceState: ({ session }) => ({ state: { ...session.state, round: session.state.round + 1 } }),
  });
}

describe('MemorySessionStore', () => {
  it('create returns id, hostToken, revision=1 and initial state', async () => {
    const store = makeStore();
    const created = await store.create({ state: gsLobby() });
    expect(created.id).toMatch(/^sess_/);
    expect(created.hostToken.length).toBeGreaterThan(8);
    expect(created.revision).toBe(1);
    expect(created.state.round).toBe(0);
  });

  it('get returns the same snapshot after create', async () => {
    const store = makeStore();
    const c = await store.create({ state: gsLobby() });
    const g = await store.get(c.id);
    expect(g?.id).toBe(c.id);
    expect(g?.revision).toBe(1);
  });

  it('update requires correct revision and bumps revision', async () => {
    const store = makeStore();
    const c = await store.create({ state: gsLobby() });
    const u = await store.update(c.id, 1, (state) => ({ ...state, coreMetric: { ...state.coreMetric, value: 80 } }));
    expect(u.revision).toBe(2);
    expect(u.state.coreMetric.value).toBe(80);
  });

  it('update with stale revision throws RevisionConflictError containing latest', async () => {
    const store = makeStore();
    const c = await store.create({ state: gsLobby() });
    const u = await store.update(c.id, 1, (state) => ({ ...state, coreMetric: { ...state.coreMetric, value: 70 } }));
    expect(u.revision).toBe(2);
    await expect(store.update(c.id, 1, (s) => s)).rejects.toBeInstanceOf(RevisionConflictError);
  });

  it('submitActions marks submitted[playerId]=true and bumps revision', async () => {
    const store = makeStore();
    const c = await store.create({ state: gsLobby() });
    const u = await store.update(c.id, 1, (s) => s);
    const s1 = await store.submitActions(c.id, 'human', u.revision, [createActionOption()]);
    expect(s1.revision).toBe(u.revision + 1);
    expect(s1.submitted['human']).toBe(true);
  });

  it('advance uses injected resolver, increments round, resets submitted, bumps revision', async () => {
    const store = makeStore();
    const c = await store.create({ state: gsLobby() });
    const s1 = await store.submitActions(c.id, 'human', 1, []);
    const a = await store.advance(c.id, s1.revision);
    expect(a.state.round).toBe(1);
    expect(Object.keys(a.submitted).length).toBe(0);
    expect(a.revision).toBe(s1.revision + 1);
  });

  it('subscribe receives events for update and advance', async () => {
    const store = makeStore();
    const c = await store.create({ state: gsLobby() });
    const events: string[] = [];
    const unsubscribe = store.subscribe(c.id, (evt) => events.push(evt.type));
    await store.update(c.id, 1, (state) => ({ ...state }));
    const s1 = await store.submitActions(c.id, 'human', 2, []);
    await store.advance(c.id, s1.revision);
    unsubscribe();
    expect(events).toEqual(['update', 'update', 'advance']);
  });
});
