import type { GameState, ActionOption, GameSetup, Player } from '../../types/core';

export interface AdvanceContext {
  humanRoleName?: string;
  humanPlayerId?: string;
  humanActions?: ActionOption[];
  humanAvailableOptions?: ActionOption[];
}

export interface SessionSnapshot {
  id: string;
  state: GameState;
  revision: number;
  hostToken: string;
  deadlineAt: string | null;
  submitted: Record<string, boolean>;
  setup?: GameSetup;
  players?: Player[];
}

export type SessionEventType = 'update' | 'advance' | 'progress';

export interface SessionEvent {
  type: SessionEventType;
  snapshot: SessionSnapshot;
  payload?: Record<string, unknown>;
}

export type SessionSubscriber = (event: SessionEvent) => void;

export interface CreateArgs {
  state: GameState;
  hostToken?: string;
  setup?: GameSetup;
  players?: Player[];
}

export interface SessionStore {
  create(args: CreateArgs): Promise<SessionSnapshot>;
  get(id: string): Promise<SessionSnapshot | null>;
  update(id: string, expectedRevision: number, mut: (state: GameState) => GameState): Promise<SessionSnapshot>;
  submitActions(
    id: string,
    playerId: string,
    expectedRevision: number,
    actions: ActionOption[],
  ): Promise<SessionSnapshot>;
  advance(id: string, expectedRevision: number, context?: AdvanceContext): Promise<SessionSnapshot>;
  subscribe(id: string, subscriber: SessionSubscriber): () => void;
  publish?(id: string, event: SessionEvent): void;
  setDebrief?(id: string, expectedRevision: number, debrief: unknown): Promise<SessionSnapshot>;
}

export class RevisionConflictError extends Error {
  latest?: SessionSnapshot;
  constructor(message: string, latest?: SessionSnapshot) {
    super(message);
    this.name = 'RevisionConflictError';
    this.latest = latest;
  }
}
