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

  /**
   * Retry wrapper for mutation paths on cold instances.
   * If the in-memory check throws `NotFound`, warm from Redis via get(id) and retry once.
   */
  private async warmAndRetry<T>(id: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      // Only handle the specific cold-instance condition from MemorySessionStore.withRevisionCheck
      if (err && typeof err.message === 'string' && err.message === 'NotFound') {
        try {
          console.warn(`[${this.className}] cold instance for ${id}; warming from Redis and retrying once`);
          await this.get(id); // warm memory from Redis (no-op if already present)
          return await fn();
        } catch (err2) {
          throw err2;
        }
      }
      throw err;
    }
  }

  async create(args: CreateArgs): Promise<SessionSnapshot> {
    // Create in memory first
    const snap = await super.create(args);

    // Save to Redis (fire-and-forget, log errors)
    try {
      const redis = await getRedis();
      // Store as string to ensure consistent serialization
      const serialized = JSON.stringify(snap);
      await redis.hset(this.key(snap.id), { data: serialized });
      await redis.expire(this.key(snap.id), TTL);
      console.log(`[RedisSessionStore] Saved session ${snap.id} (${serialized.length} bytes)`);
    } catch (err) {
      console.error('[RedisSessionStore] Create failed:', err);
      // Continue with in-memory version
    }

    return snap;
  }

  async get(id: string): Promise<SessionSnapshot | null> {
    const startTime = Date.now();
    console.log(`[RedisSessionStore] Getting session ${id}...`);

    // Try Redis first
    try {
      const redisStartTime = Date.now();
      const redis = await getRedis();
      const redisClientTime = Date.now() - redisStartTime;
      console.log(`[RedisSessionStore] Redis client ready (${redisClientTime}ms), fetching ${this.key(id)}`);

      const hgetStartTime = Date.now();
      const data = await redis.hget<string>(this.key(id), 'data');
      const hgetTime = Date.now() - hgetStartTime;

      console.log(`[RedisSessionStore] Redis hget completed in ${hgetTime}ms:`, {
        hasData: !!data,
        dataType: typeof data,
        dataLength: data ? String(data).length : 0,
        isString: typeof data === 'string',
        isObject: typeof data === 'object'
      });

      if (data) {
        // Upstash may return the data as a string or as an already-parsed object
        let snap: SessionSnapshot;

        if (typeof data === 'string') {
          snap = JSON.parse(data) as SessionSnapshot;
        } else if (typeof data === 'object') {
          // Upstash returned already-parsed data
          snap = data as SessionSnapshot;
        } else {
          console.error(`[RedisSessionStore] Unexpected data type: ${typeof data}`);
          throw new Error('Unexpected data type from Redis');
        }

        // Refresh TTL
        await redis.expire(this.key(id), TTL);
        const totalTime = Date.now() - startTime;
        console.log(`[RedisSessionStore] ✅ Retrieved session ${id} from Redis (total: ${totalTime}ms)`);

        // CRITICAL: Update in-memory cache so subsequent update() calls work
        // This is necessary because update() calls super.update() which requires the session to be in memory
        this.sessions.set(id, snap);
        console.log(`[RedisSessionStore] Updated in-memory cache for session ${id}`);

        return snap;
      }

      const totalTime = Date.now() - startTime;
      console.log(`[RedisSessionStore] Session ${id} not found in Redis (${totalTime}ms), falling back to memory`);
    } catch (err) {
      const totalTime = Date.now() - startTime;
      console.error(`[RedisSessionStore] Get from Redis failed after ${totalTime}ms:`, err);
    }

    // Fall back to memory
    const memResult = await super.get(id);
    console.log(`[RedisSessionStore] Memory fallback result: ${memResult ? 'found' : 'not found'}`);
    return memResult;
  }

  async update(
    id: string,
    expectedRevision: number,
    mut: (state: GameState) => GameState
  ): Promise<SessionSnapshot> {
    // Update memory first (with cold-instance warm+retry)
    const snap = await this.warmAndRetry(id, () => super.update(id, expectedRevision, mut));

    // Save to Redis
    // TODO: Add optimistic locking with WATCH + MULTI/EXEC
    try {
      const redis = await getRedis();
      const serialized = JSON.stringify(snap);
      await redis.hset(this.key(id), { data: serialized });
      await redis.expire(this.key(id), TTL);
      console.log(`[RedisSessionStore] Updated session ${id} rev=${snap.revision} round=${snap.state.round} phase=${snap.state.phase} (${serialized.length} bytes)`);
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
    const snap = await this.warmAndRetry(id, () => super.submitActions(id, playerId, expectedRevision, actions));

    try {
      const redis = await getRedis();
      const serialized = JSON.stringify(snap);
      await redis.hset(this.key(id), { data: serialized });
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
    console.log(`[RedisSessionStore] advance() called for ${id} expectedRev=${expectedRevision}`);
    const snap = await this.warmAndRetry(id, () => super.advance(id, expectedRevision, context));
    console.log(`[RedisSessionStore] advance() completed: rev=${snap.revision} round=${snap.state.round} phase=${snap.state.phase}`);

    try {
      const redis = await getRedis();
      const serialized = JSON.stringify(snap);
      await redis.hset(this.key(id), { data: serialized });
      await redis.expire(this.key(id), TTL);
      console.log(`[RedisSessionStore] Saved advance to Redis: ${id} rev=${snap.revision} round=${snap.state.round} (${serialized.length} bytes)`);
    } catch (err) {
      console.error('[RedisSessionStore] advance failed:', err);
    }

    return snap;
  }

  // TODO: Implement setDebrief when needed
}
