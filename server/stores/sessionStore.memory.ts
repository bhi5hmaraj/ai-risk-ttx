import { randomBytes } from 'crypto';
import type { GameState, ActionOption, GameSetup, Player } from '../../types/core';
import type {
  SessionStore,
  SessionSnapshot,
  CreateArgs,
  AdvanceContext,
  SessionSubscriber,
  SessionEventType,
  SessionEvent,
} from './sessionStore';
import { RevisionConflictError } from './sessionStore';

export interface AdvanceResult {
  state: GameState;
  players?: Player[];
  deadlineAt?: string | null;
}

export type AdvanceStateFn = (
  input: {
    session: SessionSnapshot;
    context?: AdvanceContext;
    emit: (type: SessionEventType, snapshot: SessionSnapshot, payload?: Record<string, unknown>) => void;
  }
) => Promise<AdvanceResult> | AdvanceResult;

function rid(prefix: string) {
  try {
    return `${prefix}_${randomBytes(6).toString('hex')}`;
  } catch {
    return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

interface MemoryOpts {
  advanceState: AdvanceStateFn;
}

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, SessionSnapshot>();
  private readonly advanceState: AdvanceStateFn;
  private listeners = new Map<string, Set<SessionSubscriber>>();

  constructor(opts: MemoryOpts) {
    this.advanceState = opts.advanceState;
  }

  async create(args: CreateArgs): Promise<SessionSnapshot> {
    const id = rid('sess');
    const hostToken = args.hostToken ?? rid('host');
    const snap: SessionSnapshot = {
      id,
      state: args.state,
      revision: 1,
      hostToken,
      deadlineAt: null,
      submitted: {},
      setup: args.setup,
      players: args.players ?? [],
    };
    this.sessions.set(id, snap);
    return snap;
  }

  async get(id: string): Promise<SessionSnapshot | null> {
    return this.sessions.get(id) ?? null;
  }

  private withRevisionCheck(id: string, expectedRevision: number): SessionSnapshot {
    const current = this.sessions.get(id);
    if (!current) throw new Error('NotFound');
    if (current.revision !== expectedRevision) {
      throw new RevisionConflictError('Revision mismatch', current);
    }
    return current;
  }

  async update(
    id: string,
    expectedRevision: number,
    mut: (state: GameState) => GameState
  ): Promise<SessionSnapshot> {
    const current = this.withRevisionCheck(id, expectedRevision);
    const nextState = mut(current.state);
    const next: SessionSnapshot = {
      ...current,
      state: nextState,
      revision: current.revision + 1,
    };
    this.sessions.set(id, next);
    this.emit(id, 'update', next);
    return next;
  }

  async submitActions(
    id: string,
    playerId: string,
    expectedRevision: number,
    actions: ActionOption[]
  ): Promise<SessionSnapshot> {
    const current = this.withRevisionCheck(id, expectedRevision);
    const submitted = { ...current.submitted, [playerId]: true };
    const players = current.players
      ? current.players.map((p) =>
          p.id === playerId
            ? { ...p, actions, hasSubmittedActions: true }
            : p
        )
      : current.players;
    const next: SessionSnapshot = { ...current, revision: current.revision + 1, submitted, players };
    this.sessions.set(id, next);
    this.emit(id, 'update', next);
    return next;
  }

  async advance(id: string, expectedRevision: number, context?: AdvanceContext): Promise<SessionSnapshot> {
    const current = this.withRevisionCheck(id, expectedRevision);
    const emit = (type: SessionEventType, snapshot: SessionSnapshot, payload?: Record<string, unknown>) => {
      this.emit(id, type, snapshot, payload);
    };
    const result = await this.advanceState({ session: current, context, emit });
    const next: SessionSnapshot = {
      ...current,
      state: result.state,
      revision: current.revision + 1,
      submitted: {},
      deadlineAt: result.deadlineAt ?? null,
      players: result.players ?? current.players,
    };
    this.sessions.set(id, next);
    this.emit(id, 'advance', next);
    return next;
  }

  subscribe(id: string, subscriber: SessionSubscriber): () => void {
    const set = this.listeners.get(id) ?? new Set<SessionSubscriber>();
    set.add(subscriber);
    this.listeners.set(id, set);
    return () => {
      const bucket = this.listeners.get(id);
      if (!bucket) return;
      bucket.delete(subscriber);
      if (bucket.size === 0) {
        this.listeners.delete(id);
      }
    };
  }

  publish(id: string, event: SessionEvent): void {
    this.emit(id, event.type, event.snapshot, event.payload);
  }

  private emit(id: string, type: SessionEventType, snapshot: SessionSnapshot, payload?: Record<string, unknown>) {
    const bucket = this.listeners.get(id);
    if (!bucket || bucket.size === 0) return;
    bucket.forEach((listener) => {
      try {
        listener({ type, snapshot, payload });
      } catch (err) {
        console.error('[MemorySessionStore] listener error:', err);
      }
    });
  }
}
