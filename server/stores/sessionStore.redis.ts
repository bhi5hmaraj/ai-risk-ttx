import { getRedis } from '../lib/redisClient';
import type { SessionSnapshot, CreateArgs, AdvanceContext } from './sessionStore';
import { MemorySessionStore, type AdvanceStateFn } from './sessionStore.memory';
import type { GameState, ActionOption } from '../../types/core';

const TTL = 86400; // 24 hours

/**
 * Redis-backed session store with graceful fallback to memory.
 *
 * Strategy: Extend MemorySessionStore and save to Redis after each operation.
 * If Redis fails, we fall back to the in-memory copy.
 *
 * TODOs (add when needed):
 * - Optimistic locking with WATCH + MULTI/EXEC
 * - Pub/Sub for cross-instance updates
 * - Connection retry logic
 * - Metrics and monitoring
 * - Schema validation on deserialize
 */
export class RedisSessionStore extends MemorySessionStore {
  protected className = 'RedisSessionStore';

  constructor(opts: { advanceState: AdvanceStateFn }) {
    super(opts);
  }

  private key(id: string): string {
    return `session:${id}`;
  }

  async create(args: CreateArgs): Promise<SessionSnapshot> {
    // Create in memory first
    const snap = await super.create(args);

    // Save to Redis (fire-and-forget, log errors)
    try {
      const redis = await getRedis();
      await redis.hSet(this.key(snap.id), {
        data: JSON.stringify(snap),
      });
      await redis.expire(this.key(snap.id), TTL);
      console.log(`[RedisSessionStore] Saved session ${snap.id}`);
    } catch (err) {
      console.error('[RedisSessionStore] Create failed:', err);
      // Continue with in-memory version
    }

    return snap;
  }

  async get(id: string): Promise<SessionSnapshot | null> {
    // Try Redis first
    try {
      const redis = await getRedis();
      const data = await redis.hGet(this.key(id), 'data');

      if (data) {
        // TODO: Validate schema with Zod
        const snap = JSON.parse(data) as SessionSnapshot;

        // Refresh TTL
        await redis.expire(this.key(id), TTL);

        return snap;
      }
    } catch (err) {
      console.error('[RedisSessionStore] Get from Redis failed:', err);
    }

    // Fall back to memory
    return super.get(id);
  }

  async update(
    id: string,
    expectedRevision: number,
    mut: (state: GameState) => GameState
  ): Promise<SessionSnapshot> {
    // Update memory first
    const snap = await super.update(id, expectedRevision, mut);

    // Save to Redis
    // TODO: Add optimistic locking with WATCH + MULTI/EXEC
    try {
      const redis = await getRedis();
      await redis.hSet(this.key(id), {
        data: JSON.stringify(snap),
      });
      await redis.expire(this.key(id), TTL);
    } catch (err) {
      console.error('[RedisSessionStore] Update failed:', err);
    }

    return snap;
  }

  async submitActions(
    id: string,
    playerId: string,
    expectedRevision: number,
    actions: ActionOption[]
  ): Promise<SessionSnapshot> {
    const snap = await super.submitActions(id, playerId, expectedRevision, actions);

    try {
      const redis = await getRedis();
      await redis.hSet(this.key(id), { data: JSON.stringify(snap) });
      await redis.expire(this.key(id), TTL);
    } catch (err) {
      console.error('[RedisSessionStore] submitActions failed:', err);
    }

    return snap;
  }

  async advance(
    id: string,
    expectedRevision: number,
    context?: AdvanceContext
  ): Promise<SessionSnapshot> {
    const snap = await super.advance(id, expectedRevision, context);

    try {
      const redis = await getRedis();
      await redis.hSet(this.key(id), { data: JSON.stringify(snap) });
      await redis.expire(this.key(id), TTL);
    } catch (err) {
      console.error('[RedisSessionStore] advance failed:', err);
    }

    return snap;
  }

  // TODO: Implement setDebrief when needed
}
