import { describe, it, expect } from 'vitest';
import { GameState } from '@/server/rooms/schema/GameState';
import { PlayerManagementHandler } from '@/server/rooms/handlers/PlayerManagementHandler';
import { SeatRegistry } from '@/server/rooms/services/SeatRegistry';

class MockClient {
  sessionId: string;
  sent: { type: string; payload: any }[] = [];
  constructor(id: string) { this.sessionId = id; }
  send(type: string, payload: any) { this.sent.push({ type, payload }); }
}

function makeHandler() {
  const state = new GameState();
  const seats = new SeatRegistry();
  const stateManager = {
    getCorePlayer: () => undefined,
    addPlayer: () => {},
    removePlayer: () => {},
  } as any;
  const logger = { info: () => {}, warn: () => {}, error: () => {} } as any;
  const handler = new PlayerManagementHandler({
    state,
    stateManager,
    logger,
    rid: 'test',
    broadcast: () => {},
    emitPlayersInit: () => {},
    seats,
  } as any);
  return { state, handler, seats };
}

describe('Seat/Role protection', () => {
  it('denies duplicate role claims and keeps the first claimant', () => {
    const { state, handler } = makeHandler();

    const c1 = new MockClient('sess1');
    const c2 = new MockClient('sess2');

    handler.handlePlayerJoin(c1 as any, { name: 'Alice', role: 'Tech CEO', isHuman: true });
    handler.handlePlayerJoin(c2 as any, { name: 'Bob', isHuman: true });

    // Second client tries to take the same role
    handler.handleSetRole(c2 as any, 'Tech CEO', 'Bob');

    const p1 = state.players.get('sess1');
    const p2 = state.players.get('sess2');

    expect(p1?.role).toBe('Tech CEO');
    expect(p2?.role).toBe('');
    // An error should have been sent to c2
    expect(c2.sent.find(m => m.type === 'error' && m.payload?.message === 'role_taken')).toBeTruthy();
  });
});

