import { describe, it, expect } from 'vitest';
import {
  CreateSessionRequestSchema,
  GameStateSchema,
  GameSetupSchema,
  ActionOptionSchema,
  SubmitActionsRequestSchema,
  SessionSnapshotSchema,
} from './session';
import { createValidGameState, createValidGameSetup, createActionOption } from '../../tests/fixtures/session-data';

describe('Session contracts (Zod)', () => {
  it('accepts a valid CreateSession request', () => {
    const valid = {
      mode: 'classic',
      setup: createValidGameSetup(),
      maxRounds: 5,
      aiPlayers: 2,
    };
    const parsed = CreateSessionRequestSchema.parse(valid);
    expect(parsed.mode).toBe('classic');
  });

  it('rejects invalid CreateSession mode', () => {
    const invalid = { mode: 'unknown' } as any;
    expect(() => CreateSessionRequestSchema.parse(invalid)).toThrow();
  });

  it('accepts a valid GameState snapshot', () => {
    const gs = createValidGameState();
    expect(() => GameStateSchema.parse(gs)).not.toThrow();
  });

  it('rejects GameState with out-of-range coreMetric value', () => {
    const gs = createValidGameState();
    (gs.coreMetric as any).value = 101;
    expect(() => GameStateSchema.parse(gs)).toThrow();
  });

  it('accepts a valid GameSetup', () => {
    expect(() => GameSetupSchema.parse(createValidGameSetup())).not.toThrow();
  });

  it('accepts valid ActionOption and SubmitActions', () => {
    const ao = createActionOption();
    expect(() => ActionOptionSchema.parse(ao)).not.toThrow();
    const submit = { playerId: 'p1', actions: [ao, ao] };
    expect(() => SubmitActionsRequestSchema.parse(submit)).not.toThrow();
  });

  it('rejects SubmitActions with negative cost', () => {
    const bad = createActionOption();
    (bad as any).cost = 0;
    expect(() => ActionOptionSchema.parse(bad)).toThrow();
  });

  it('accepts a minimal SessionSnapshot', () => {
    const snap = {
      id: 'sess_1',
      revision: 1,
      state: createValidGameState(),
    };
    expect(() => SessionSnapshotSchema.parse(snap)).not.toThrow();
  });
});

