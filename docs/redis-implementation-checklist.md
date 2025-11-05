# Redis Session Store - MVP Checklist

**Get it working in 1-2 hours, then iterate**

## Today's Goal: Basic Persistence

### Step 1: Install Redis Client (5 minutes)

```bash
cd /home/bhishma/Documents/code/ai-risk-ttx-nextjs
npm install redis
```

### Step 2: Create Redis Client Singleton (10 minutes)

Create `server/lib/redisClient.ts`:

```typescript
import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | null = null;

export async function getRedis() {
  if (client?.isOpen) return client;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL not set');

  client = createClient({ url });
  await client.connect();
  console.log('[Redis] Connected');
  return client;
}

export function isRedisConnected(): boolean {
  return client?.isOpen ?? false;
}
```

### Step 3: Create Redis Session Store (30 minutes)

Create `server/stores/sessionStore.redis.ts`:

```typescript
import { getRedis } from '../lib/redisClient';
import type { SessionSnapshot, CreateArgs, AdvanceContext } from './sessionStore';
import { MemorySessionStore, type AdvanceStateFn } from './sessionStore.memory';
import type { GameState, ActionOption } from '../../types/core';

const TTL = 86400; // 24 hours

export class RedisSessionStore extends MemorySessionStore {
  constructor(opts: { advanceState: AdvanceStateFn }) {
    super(opts);
  }

  private key(id: string): string {
    return `session:${id}`;
  }

  async create(args: CreateArgs): Promise<SessionSnapshot> {
    const snap = await super.create(args);

    try {
      const redis = await getRedis();
      await redis.hSet(this.key(snap.id), { data: JSON.stringify(snap) });
      await redis.expire(this.key(snap.id), TTL);
      console.log(`[RedisSessionStore] Saved session ${snap.id}`);
    } catch (err) {
      console.error('[RedisSessionStore] Create failed:', err);
    }

    return snap;
  }

  async get(id: string): Promise<SessionSnapshot | null> {
    try {
      const redis = await getRedis();
      const data = await redis.hGet(this.key(id), 'data');

      if (data) {
        const snap = JSON.parse(data) as SessionSnapshot;
        await redis.expire(this.key(id), TTL);
        return snap;
      }
    } catch (err) {
      console.error('[RedisSessionStore] Get failed:', err);
    }

    return super.get(id);
  }

  async update(
    id: string,
    expectedRevision: number,
    mut: (state: GameState) => GameState
  ): Promise<SessionSnapshot> {
    const snap = await super.update(id, expectedRevision, mut);

    try {
      const redis = await getRedis();
      await redis.hSet(this.key(id), { data: JSON.stringify(snap) });
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
```

### Step 4: Wire It Up (10 minutes)

Find where you create the session store (probably in `app/api/session/[[...parts]]/route.ts` or similar) and add:

```typescript
import { RedisSessionStore } from '@/server/stores/sessionStore.redis';

// Where you currently do: new MemorySessionStore({ advanceState })
const storeType = process.env.SESSION_STORE_TYPE;

const store = storeType === 'redis'
  ? new RedisSessionStore({ advanceState })
  : new MemorySessionStore({ advanceState });
```

### Step 5: Add Environment Variable (2 minutes)

```bash
# Add to .env.local
echo "REDIS_URL=your-upstash-redis-url" >> .env.local
echo "SESSION_STORE_TYPE=redis" >> .env.local
```

### Step 6: Test It! (15 minutes)

```bash
# 1. Start dev server
SESSION_STORE_TYPE=redis npm run dev

# 2. Create a session (note the ID)
curl -X POST http://localhost:3000/api/session \
  -H "Content-Type: application/json" \
  -d '{"mode":"classic"}'

# 3. Restart the server (Ctrl+C, then npm run dev again)

# 4. Get the session - should still exist!
curl http://localhost:3000/api/session/YOUR_SESSION_ID
```

---

## That's It for MVP!

You now have:
- ✅ Sessions persisting to Redis
- ✅ Graceful fallback to memory on errors
- ✅ ~150 lines of code total
- ✅ Working in ~1-2 hours

## Future TODOs (Add When Needed)

### Week 2: Strengthen
- [ ] Add optimistic locking (WATCH + MULTI/EXEC) when you see race conditions
- [ ] Add connection retry logic when you see connection drops
- [ ] Implement `setDebrief` if using debrief feature

### Week 3: Multiplayer (if needed)
- [ ] Add Pub/Sub for cross-instance updates
- [ ] Test with multiple server instances

### Week 4: Production (if deploying)
- [ ] Add health check to `/api/meta/status`
- [ ] Add metrics (latency, errors)
- [ ] Load testing
- [ ] Monitoring dashboard

### Later: Nice-to-Haves
- [ ] Schema validation with Zod
- [ ] Circuit breaker pattern
- [ ] Event sourcing with Redis Streams
- [ ] Write automated tests

---

## Quick Commands

```bash
# Run with Redis
SESSION_STORE_TYPE=redis npm run dev

# Run with memory (default)
npm run dev

# Check Redis directly
redis-cli -u $REDIS_URL
> KEYS session:*
> HGETALL session:sess_xxxxx

# Monitor Redis in real-time
redis-cli -u $REDIS_URL MONITOR
```

## Troubleshooting

**"REDIS_URL not set"**
- Add `REDIS_URL=...` to `.env.local`

**"Connection refused"**
- Check Upstash dashboard
- Verify REDIS_URL is correct
- Try: `redis-cli -u $REDIS_URL PING`

**Sessions not persisting**
- Check console logs for errors
- Verify `SESSION_STORE_TYPE=redis` is set
- Check Redis: `redis-cli -u $REDIS_URL KEYS 'session:*'`

**Server crashes on startup**
- Remove `SESSION_STORE_TYPE=redis` to fall back to memory
- Check error logs
- Verify Redis URL is accessible

---

## Success Criteria

- [x] npm install completes without errors
- [ ] Server starts with `SESSION_STORE_TYPE=redis`
- [ ] Can create a session via API
- [ ] Session persists after server restart
- [ ] No errors in console logs
- [ ] Falls back to memory if Redis fails

Total time: **~1-2 hours** for a working MVP!
