# Redis Session Store - Architecture Summary

**Quick Visual Overview - MVP Version**

> **Philosophy**: Get it working in 1-2 hours. Extend MemorySessionStore, add Redis saves. Fall back gracefully on errors.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client (Browser/App)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Next.js API Routes (Vercel Serverless)             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  /api/session/[[...parts]]/route.ts                       │  │
│  │  (Session Router)                                          │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Store Factory (server/stores/factory.ts)                 │  │
│  │  ┌──────────────┐         SESSION_STORE_TYPE              │  │
│  │  │   Memory?    │────────────┐                            │  │
│  │  └──────────────┘            │                            │  │
│  │  ┌──────────────┐            ▼                            │  │
│  │  │   Redis?     │────────────────────────────────────┐    │  │
│  │  └──────────────┘                                     │    │  │
│  └───────────────────────────────────────────────────────┼────┘  │
└────────────────────────────────────────────────────────┼────────┘
                                                          │
         ┌────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Redis (Upstash Cloud)                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Data Structures                                           │ │
│  │                                                            │ │
│  │  1. Hashes: session:{id}                                  │ │
│  │     ├─ id                                                 │ │
│  │     ├─ state (JSON)                                       │ │
│  │     ├─ revision (int)                                     │ │
│  │     ├─ hostToken                                          │ │
│  │     ├─ players (JSON)                                     │ │
│  │     ├─ submitted (JSON)                                   │ │
│  │     ├─ setup (JSON)                                       │ │
│  │     ├─ deadlineAt                                         │ │
│  │     └─ TTL: 24 hours                                      │ │
│  │                                                            │ │
│  │  2. Pub/Sub: session:{id}:events                          │ │
│  │     └─ Real-time events (update, advance, progress)       │ │
│  │                                                            │ │
│  │  3. Sorted Set: session:index:active                      │ │
│  │     └─ Active sessions sorted by createdAt (for cleanup)  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Session Creation

```
Client                 API Route              Store Factory        RedisSessionStore       Redis
  │                       │                        │                      │                  │
  │ POST /api/session     │                        │                      │                  │
  ├──────────────────────>│                        │                      │                  │
  │                       │ createSessionStore()   │                      │                  │
  │                       ├───────────────────────>│                      │                  │
  │                       │                        │ new RedisSessionStore│                  │
  │                       │                        ├─────────────────────>│                  │
  │                       │                        │                      │                  │
  │                       │ store.create(args)     │                      │                  │
  │                       ├────────────────────────┼─────────────────────>│                  │
  │                       │                        │                      │ HSET session:X   │
  │                       │                        │                      ├─────────────────>│
  │                       │                        │                      │                  │
  │                       │                        │                      │ ZADD index       │
  │                       │                        │                      ├─────────────────>│
  │                       │                        │                      │                  │
  │                       │                        │                      │ EXPIRE 86400     │
  │                       │                        │                      ├─────────────────>│
  │                       │                        │                      │                  │
  │                       │  SessionSnapshot       │                      │                  │
  │<──────────────────────┼────────────────────────┼──────────────────────┤                  │
  │ {id, revision, ...}   │                        │                      │                  │
```

## Data Flow: Optimistic Update with Revision Check

```
Client                 API Route              RedisSessionStore       Redis
  │                       │                        │                      │
  │ POST /actions         │                        │                      │
  │ If-Match: 5           │                        │                      │
  ├──────────────────────>│                        │                      │
  │                       │ submitActions(id,      │                      │
  │                       │   expectedRev=5)       │                      │
  │                       ├───────────────────────>│                      │
  │                       │                        │ WATCH session:X      │
  │                       │                        ├─────────────────────>│
  │                       │                        │                      │
  │                       │                        │ HGETALL session:X    │
  │                       │                        ├─────────────────────>│
  │                       │                        │<─────────────────────┤
  │                       │                        │ {revision: "5"}      │
  │                       │                        │                      │
  │                       │                        │ ✅ Revision matches   │
  │                       │                        │ Update players[]     │
  │                       │                        │ revision = 6         │
  │                       │                        │                      │
  │                       │                        │ MULTI                │
  │                       │                        ├─────────────────────>│
  │                       │                        │ HSET session:X       │
  │                       │                        ├─────────────────────>│
  │                       │                        │ EXPIRE 86400         │
  │                       │                        ├─────────────────────>│
  │                       │                        │ EXEC                 │
  │                       │                        ├─────────────────────>│
  │                       │                        │                      │
  │                       │  SessionSnapshot       │                      │
  │<──────────────────────┼────────────────────────┤                      │
  │ {revision: 6}         │                        │                      │
  │ ETag: "6"             │                        │                      │
```

## Data Flow: Revision Conflict (409)

```
Client A              Client B              RedisSessionStore       Redis
  │                      │                        │                      │
  │ If-Match: 5          │                        │                      │
  ├─────────────────────────────────────────────>│ WATCH + HGETALL      │
  │                      │                        ├─────────────────────>│
  │                      │                        │ {revision: "5"}      │
  │                      │ If-Match: 5            │                      │
  │                      ├───────────────────────>│ WATCH + HGETALL      │
  │                      │                        ├─────────────────────>│
  │                      │                        │ {revision: "5"}      │
  │                      │                        │                      │
  │                      │                        │ MULTI + HSET + EXEC  │
  │                      │                        ├─────────────────────>│
  │                      │                        │ ✅ revision = 6       │
  │                      │                        │                      │
  │ ✅ Success            │                        │                      │
  │<─────────────────────┼────────────────────────┤                      │
  │ {revision: 6}        │                        │                      │
  │                      │                        │                      │
  │                      │                        │ MULTI + EXEC         │
  │                      │                        ├─────────────────────>│
  │                      │                        │ ❌ WATCH invalidated  │
  │                      │                        │                      │
  │                      │ ❌ 409 Conflict        │                      │
  │                      │<───────────────────────┤                      │
  │                      │ {latest: {revision:6}} │                      │
  │                      │                        │                      │
  │                      │ Retry with rev=6       │                      │
  │                      ├───────────────────────>│                      │
```

## Pub/Sub: Real-Time Updates Across Instances

```
Instance 1            Instance 2            Redis Pub/Sub
   │                      │                        │
   │ subscribe(sess_123)  │                        │
   ├─────────────────────────────────────────────>│
   │                      │ subscribe(sess_123)    │
   │                      ├───────────────────────>│
   │                      │                        │
   │ advance(sess_123)    │                        │
   ├──────────────────────┤                        │
   │ PUBLISH              │                        │
   │  session:sess_123:   │                        │
   │  events              │                        │
   ├─────────────────────────────────────────────>│
   │                      │                        │
   │ ✅ Event received     │                        │
   │<─────────────────────────────────────────────┤
   │ (update UI)          │                        │
   │                      │ ✅ Event received       │
   │                      │<───────────────────────┤
   │                      │ (update UI)            │
```

## Key Design Patterns

### 1. Singleton Pattern (Redis Client)

```typescript
// server/lib/redisClient.ts
let client: RedisClientType | null = null;

export async function getRedisClient() {
  if (client?.isOpen) return client;
  // ... initialize and connect
  return client;
}
```

**Why**: Reuse connections across serverless invocations (Vercel keeps instances warm).

### 2. Optimistic Locking (WATCH + MULTI/EXEC)

```typescript
await client.watch(key);
const current = await get(id);
if (current.revision !== expectedRevision) {
  await client.unwatch();
  throw new RevisionConflictError('Revision mismatch', current);
}
// ... mutations
const multi = client.multi();
multi.hSet(key, data);
const result = await multi.exec();
if (!result) throw new RevisionConflictError('Transaction failed');
```

**Why**: Prevents lost updates in concurrent scenarios (multiple players/instances).

### 3. Factory Pattern (Store Selection)

```typescript
export function createSessionStore(opts) {
  const type = process.env.SESSION_STORE_TYPE ?? 'memory';
  return type === 'redis'
    ? new RedisSessionStore(opts)
    : new MemorySessionStore(opts);
}
```

**Why**: Seamless switching between memory and Redis without code changes.

### 4. Pub/Sub Pattern (Cross-Instance Events)

```typescript
// Publisher
await client.publish('session:X:events', JSON.stringify(event));

// Subscriber
await pubSubClient.subscribe('session:X:events', (message) => {
  const event = JSON.parse(message);
  // notify local listeners
});
```

**Why**: Real-time updates across serverless instances without polling.

## Performance Characteristics

| Operation        | Memory Store | Redis Store (p50) | Redis Store (p99) |
|------------------|--------------|-------------------|-------------------|
| `create()`       | < 1ms        | ~20ms             | ~80ms             |
| `get()`          | < 1ms        | ~15ms             | ~60ms             |
| `update()`       | < 1ms        | ~25ms             | ~100ms            |
| `submitActions()`| < 1ms        | ~30ms             | ~120ms            |
| `advance()`      | ~50ms*       | ~100ms*           | ~300ms*           |

\* Includes LLM call time (dominant factor)

## Failure Scenarios & Mitigation

| Scenario                 | Impact                      | Mitigation                          |
|--------------------------|-----------------------------|-------------------------------------|
| Redis unavailable        | 503 errors on mutations     | Fallback to memory store (env var)  |
| High latency (>500ms)    | Slow page loads             | Circuit breaker, alerts             |
| Connection pool exhausted| New requests timeout        | Increase pool size, rate limiting   |
| Pub/Sub subscriber leak  | Memory grows over time      | Cleanup on unsubscribe, monitoring  |
| Serialization error      | Session data corrupted      | Try/catch + log, return null        |

## Environment Configuration

```bash
# .env.local (development)
REDIS_URL=redis://default:password@endpoint.upstash.io:6379
SESSION_STORE_TYPE=redis
REDIS_SESSION_TTL_SECONDS=86400

# Vercel Environment Variables (production)
REDIS_URL=redis://...                 # Secret
SESSION_STORE_TYPE=redis              # Plain text
REDIS_SESSION_TTL_SECONDS=86400       # Plain text
```

## File Structure

```
server/
├── lib/
│   ├── redisClient.ts          # Connection singleton + health checks
│   └── redisClient.test.ts
├── stores/
│   ├── sessionStore.ts         # Interface (existing)
│   ├── sessionStore.memory.ts  # Memory impl (existing)
│   ├── sessionStore.redis.ts   # NEW: Redis impl
│   ├── sessionStore.redis.test.ts
│   └── factory.ts              # NEW: Store factory

tests/
└── api/
    └── session-store-integration.test.ts

docs/
├── redis-session-store.md              # Full design (this is the main doc)
├── redis-implementation-checklist.md   # Step-by-step tasks
└── redis-architecture-summary.md       # THIS FILE (visual overview)
```

## Quick Start Commands (MVP)

```bash
# 1. Install dependencies (5 min)
npm install redis

# 2. Create the 2 files (30 min)
# - server/lib/redisClient.ts (~30 lines)
# - server/stores/sessionStore.redis.ts (~100 lines)
# See checklist doc for full code

# 3. Wire it up in your router (5 min)
const store = process.env.SESSION_STORE_TYPE === 'redis'
  ? new RedisSessionStore({ advanceState })
  : new MemorySessionStore({ advanceState });

# 4. Add env vars
echo "REDIS_URL=redis://..." >> .env.local
echo "SESSION_STORE_TYPE=redis" >> .env.local

# 5. Test it!
SESSION_STORE_TYPE=redis npm run dev

# Create session, restart server, verify it persists
```

## MVP Timeline (Simplified!)

```
Today (1-2 hours):
  ├── npm install redis
  ├── Create redisClient.ts (~30 lines)
  ├── Create sessionStore.redis.ts (~100 lines)
  ├── Wire it up in router
  ├── Add env vars
  └── Test manually ✅

This Week (if needed):
  ├── Test with real game sessions
  └── Deploy to preview

Next Week (if needed):
  ├── Add optimistic locking (WATCH + MULTI/EXEC)
  └── Monitor for issues

Later (nice-to-haves):
  ├── Add Pub/Sub for multiplayer
  ├── Add metrics
  └── Write tests
```

## Success Metrics (MVP)

- ✅ npm install completes
- ✅ Server starts without errors
- ✅ Can create session
- ✅ Session persists after restart
- ✅ Gracefully falls back to memory on Redis errors

**Total time**: 1-2 hours for working MVP!

**Future metrics** (add later when deploying to prod):
- Latency, error rates, memory usage, etc.

## References

- **Full Design**: [redis-session-store.md](./redis-session-store.md)
- **Implementation Checklist**: [redis-implementation-checklist.md](./redis-implementation-checklist.md)
- **Session Backend**: [session-backend.md](./session-backend.md)
- **Redis Client Docs**: https://github.com/redis/node-redis
- **Upstash Redis**: https://docs.upstash.com/redis

---

**Ready to implement?** Start with the [Implementation Checklist](./redis-implementation-checklist.md) and refer to the [Full Design Doc](./redis-session-store.md) for detailed code examples.
