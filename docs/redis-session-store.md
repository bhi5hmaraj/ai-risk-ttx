# Redis Session Store Design & Implementation Plan

**Status**: Proposed (Phase 1.5)
**Owner**: Session Store Enhancement
**Created**: 2025-11-06
**Updated**: 2025-11-06 (Simplified to MVP-first approach)

## Philosophy: Start Simple, Iterate Fast

This document takes a **pragmatic, MVP-first approach**. We'll get basic Redis persistence working in ~2 hours, then progressively strengthen with TODOs sprinkled throughout the code.

## MVP Goals (Week 1)

1. **Basic persistence**: Sessions survive server restarts
2. **Graceful fallback**: If Redis fails, fall back to memory (don't crash)
3. **Minimal changes**: Extend `MemorySessionStore`, reuse existing logic
4. **Quick wins**: Get it working, then iterate

## Future Work (Sprinkle TODOs)

- Optimistic locking with WATCH + MULTI/EXEC (when we need it)
- Pub/Sub for cross-instance updates (when we add multiplayer)
- Connection pooling and retries (when we see connection issues)
- Metrics and monitoring (when we deploy to production)
- Schema validation (when we see deserialization errors)

## Architecture

### Current State (MemorySessionStore)

```
┌─────────────────────────────────────────┐
│  MemorySessionStore                     │
│  ┌────────────────────────────────────┐ │
│  │  Map<sessionId, SessionSnapshot>  │ │
│  │  - In-process only                 │ │
│  │  - Lost on restart                 │ │
│  │  - No cross-instance sharing       │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Map<sessionId, Set<Subscriber>>        │
│  - In-process pub/sub only              │
└─────────────────────────────────────────┘
```

### Proposed State (RedisSessionStore)

```
┌─────────────────────────────────────────┐
│  RedisSessionStore                      │
│  ┌────────────────────────────────────┐ │
│  │  Redis (Upstash)                   │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │ Hashes: session:{id}         │  │ │
│  │  │   - id                       │  │ │
│  │  │   - state (JSON)             │  │ │
│  │  │   - revision                 │  │ │
│  │  │   - hostToken                │  │ │
│  │  │   - setup (JSON)             │  │ │
│  │  │   - players (JSON)           │  │ │
│  │  │   - submitted (JSON)         │  │ │
│  │  │   - deadlineAt               │  │ │
│  │  │   - createdAt                │  │ │
│  │  │   - updatedAt                │  │ │
│  │  └──────────────────────────────┘  │ │
│  │                                     │ │
│  │  Pub/Sub: session:{id}:events      │ │
│  │   - Cross-instance notifications   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Connection Pool (singleton)            │
│  - Lazy initialization                  │
│  - Automatic reconnection               │
│  - Graceful degradation                 │
└─────────────────────────────────────────┘
```

## Data Model

### Redis Key Schema

```
session:{sessionId}                    → Hash (session snapshot)
session:{sessionId}:events             → Pub/Sub channel (real-time updates)
session:{sessionId}:lock               → String (optimistic locking)
session:index:active                   → Sorted Set (by createdAt, for cleanup)
```

### Session Hash Fields

```typescript
{
  id: string,                          // Session ID
  state: string,                       // JSON.stringify(GameState)
  revision: string,                    // Integer as string
  hostToken: string,                   // Auth token
  setup: string,                       // JSON.stringify(GameSetup) | null
  players: string,                     // JSON.stringify(Player[]) | null
  submitted: string,                   // JSON.stringify(Record<string, boolean>)
  deadlineAt: string,                  // ISO timestamp | null
  createdAt: string,                   // ISO timestamp
  updatedAt: string,                   // ISO timestamp
}
```

### TTL Strategy

- Default TTL: 24 hours (configurable via `REDIS_SESSION_TTL_SECONDS`)
- Refresh on read: Extend TTL on every `get()` call
- Cleanup job: Sorted set tracks active sessions for background cleanup

## Implementation Plan (MVP First!)

### Phase 1: Get It Working (1-2 hours)

**Goal**: Sessions persist to Redis. If Redis fails, fall back to memory.

**Files to Create:**
```
server/lib/redisClient.ts          # ~30 lines: Simple singleton
server/stores/sessionStore.redis.ts # ~100 lines: Extends MemorySessionStore
```

**Tasks:**
1. ✅ Add `redis` package: `npm install redis`
2. ✅ Create dead-simple Redis client singleton (no retries yet)
3. ✅ Extend `MemorySessionStore` and override key methods:
   - `create()` - Call super, then save to Redis (fire-and-forget)
   - `get()` - Try Redis first, fall back to memory on error
   - `update()` - Call super, then save to Redis (no locking yet)
4. ✅ Add environment switch: `SESSION_STORE_TYPE=redis`
5. ✅ Test manually: Create session, restart server, verify session exists

**Sprinkle TODOs:**
- `// TODO: Add optimistic locking with WATCH + MULTI/EXEC`
- `// TODO: Add Pub/Sub for cross-instance updates`
- `// TODO: Add connection retry logic`
- `// TODO: Implement submitActions and advance`

### Phase 2: Strengthen Gradually (Week 2-3)

**Only do these when you actually need them:**

1. ✅ Add remaining methods (`submitActions`, `advance`, `setDebrief`)
2. ✅ Add optimistic locking (WATCH + MULTI/EXEC) when we see race conditions
3. ✅ Add connection retry logic when we see connection drops
4. ✅ Add Pub/Sub when we add multiplayer (cross-instance updates)

### Phase 3: Production Hardening (Week 4+)

**Only when deploying to production:**

1. ✅ Add metrics (connection status, operation latency)
2. ✅ Add health check to `/api/meta/status`
3. ✅ Add graceful shutdown
4. ✅ Load testing and monitoring
5. ✅ Runbook documentation

### Phase 4: Future Enhancements

**Nice-to-haves, not blockers:**

- Event sourcing with Redis Streams
- Circuit breaker pattern
- Advanced caching strategies
- Sharding and clustering

## Code Structure (MVP Version)

### 1. Redis Client Singleton (`server/lib/redisClient.ts`) - ~30 lines

```typescript
import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | null = null;

/**
 * Get Redis client singleton. Creates connection on first call.
 * TODO: Add retry logic
 * TODO: Add reconnection strategy
 * TODO: Add graceful shutdown
 */
export async function getRedis() {
  if (client?.isOpen) return client;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL not set');

  client = createClient({ url });
  await client.connect();
  console.log('[Redis] Connected');
  return client;
}

/**
 * Check if Redis is connected (for health checks)
 */
export function isRedisConnected(): boolean {
  return client?.isOpen ?? false;
}
```

### 2. Redis Session Store MVP (`server/stores/sessionStore.redis.ts`) - ~100 lines

```typescript
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
      console.error('[RedisSessionStore] submitActions save failed:', err);
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
      console.error('[RedisSessionStore] advance save failed:', err);
    }

    return snap;
  }

  // TODO: Implement setDebrief when needed

  // TODO: Add Pub/Sub support for cross-instance updates
  // subscribe(id, subscriber) { ... }
  // publish(id, event) { ... }
}
```

### 3. Use It (in your session router/API)

```typescript
// Where you currently create the store
const storeType = process.env.SESSION_STORE_TYPE; // 'redis' or undefined

const store = storeType === 'redis'
  ? new RedisSessionStore({ advanceState })
  : new MemorySessionStore({ advanceState });
```

That's it! No factory pattern needed for MVP. Add it later if you want.

## Environment Variables (Simple!)

```bash
# .env.local
REDIS_URL=redis://default:password@endpoint.upstash.io:6379
SESSION_STORE_TYPE=redis  # Set this to enable Redis, otherwise uses memory
```

That's all you need!

## Testing Strategy (Start Manual!)

### Manual Testing (Week 1)

```bash
# 1. Start dev server with Redis
SESSION_STORE_TYPE=redis npm run dev

# 2. Create a session
curl -X POST http://localhost:3000/api/session \
  -H "Content-Type: application/json" \
  -d '{"mode":"classic"}'
# Note the session ID

# 3. Restart the server (Ctrl+C, npm run dev again)

# 4. Get the session - it should still exist!
curl http://localhost:3000/api/session/{SESSION_ID}

# 5. Check Redis directly (optional)
redis-cli -u $REDIS_URL
> HGETALL session:sess_xxxxx
```

### Automated Tests (Week 2+)

Add tests when things are stable. For now, manual testing is faster.

## Performance Considerations

### Latency Budget

- **Target p50**: < 50ms per operation
- **Target p99**: < 200ms per operation
- **Acceptable**: < 500ms for advance (includes LLM calls)

### Connection Pooling

- Use singleton pattern for Redis client
- Reuse connections across serverless invocations (Vercel keeps warm instances)
- Implement reconnection with exponential backoff

### Serialization

- Use native JSON for simplicity (v8 is fast)
- Consider MessagePack for Phase 2 if payload size becomes an issue
- Current payload size: ~5-10KB per session (acceptable)

## Operational Runbook

### Health Checks

```typescript
// GET /api/meta/status
{
  "store": {
    "type": "redis",
    "connected": true,
    "latency_ms": 15
  }
}
```

### Monitoring Metrics

- `redis.connection.status` (gauge: 0=down, 1=up)
- `redis.operation.duration` (histogram, by operation type)
- `redis.operation.errors` (counter, by error type)
- `session.active.count` (gauge from sorted set)

### Failure Scenarios

1. **Redis Unavailable**
   - Symptom: 503 errors on session mutations
   - Mitigation: Fallback to memory store (lose cross-instance sync)
   - Resolution: Check Upstash dashboard, verify REDIS_URL

2. **High Latency**
   - Symptom: Slow page loads, timeouts
   - Mitigation: Increase timeout, check network
   - Resolution: Contact Upstash support, consider Redis plan upgrade

3. **Memory Leak (Pub/Sub)**
   - Symptom: Increasing memory usage over time
   - Mitigation: Implement subscriber cleanup on disconnect
   - Resolution: Restart instances, check for unsubscribed listeners

## Quick Wins Roadmap

### Today (1-2 hours)
- [x] Install `redis`: `npm install redis`
- [ ] Create `server/lib/redisClient.ts` (~30 lines)
- [ ] Create `server/stores/sessionStore.redis.ts` (~100 lines)
- [ ] Add environment switch in router
- [ ] Test manually: create session, restart, verify persistence

### This Week (if needed)
- [ ] Add remaining methods (submitActions, advance, setDebrief)
- [ ] Test with a real game session
- [ ] Deploy to preview

### Next Week (if needed)
- [ ] Add optimistic locking (WATCH + MULTI/EXEC)
- [ ] Add connection retry logic
- [ ] Monitor for issues

### Later (nice-to-haves)
- [ ] Add Pub/Sub for multiplayer
- [ ] Add metrics and monitoring
- [ ] Write automated tests
- [ ] Add health checks

## Security Considerations

1. **REDIS_URL Protection**
   - Store in Vercel environment secrets (encrypted at rest)
   - Never log the full URL
   - Rotate credentials quarterly

2. **Session Token Storage**
   - hostToken and playerToken remain in session hash
   - Phase 2: Move tokens to separate key for rotation

3. **Data Expiration**
   - Automatic TTL prevents stale data accumulation
   - Implement background job to clean up sorted set index

## Future Enhancements (Phase 2+)

1. **Event Sourcing**
   - Store append-only event log: `session:{id}:events:*`
   - Use Redis Streams for replay and audit

2. **Sharding**
   - Partition sessions by ID prefix for horizontal scaling
   - Use Redis Cluster (Upstash supports this)

3. **Cache Layer**
   - Add in-memory LRU cache for frequently accessed sessions
   - Invalidate on pub/sub events

4. **Backup & Recovery**
   - Periodic snapshots to object storage (S3)
   - Point-in-time recovery for critical sessions

## Dependencies

```json
{
  "dependencies": {
    "redis": "^4.7.0"
  },
  "devDependencies": {
    "@types/redis": "^4.0.11",
    "ioredis-mock": "^8.9.0"
  }
}
```

## References

- [Redis Node.js Client Docs](https://github.com/redis/node-redis)
- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [Session Backend Design](./session-backend.md)
- [Modular Architecture](./modular-architecture.md)

---

**Next Steps:**
1. Review this design with team
2. Create Beads issues for each phase
3. Implement Phase 1 (Core Redis Store)
4. Write tests and documentation
5. Deploy to preview and gather metrics
