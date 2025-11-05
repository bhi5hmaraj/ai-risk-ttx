# Redis Session Store Documentation

**3 documents, 1 clear path: Get it working in 1-2 hours, then iterate.**

## Start Here

### 1. **[Implementation Checklist](./redis-implementation-checklist.md)** ⭐ START HERE
   - **What**: Step-by-step guide with code snippets
   - **When**: When you're ready to implement
   - **Time**: 1-2 hours to working MVP
   - **Output**: Basic Redis persistence with graceful fallback

### 2. **[Full Design Document](./redis-session-store.md)**
   - **What**: Complete architecture and design decisions
   - **When**: Reference while implementing or when adding features
   - **Sections**:
     - MVP goals and philosophy
     - Code structure (with full examples)
     - Environment variables
     - Manual testing guide
     - Future enhancements (TODOs)

### 3. **[Architecture Summary](./redis-architecture-summary.md)**
   - **What**: Visual diagrams and quick reference
   - **When**: To understand data flows or troubleshoot
   - **Contains**:
     - System architecture diagrams
     - Data flow diagrams (create, update, conflict scenarios)
     - Performance characteristics
     - Quick commands and troubleshooting

## Quick Start (TL;DR)

```bash
# 1. Install
npm install redis

# 2. Create two files (~150 lines total)
#    - server/lib/redisClient.ts (~30 lines)
#    - server/stores/sessionStore.redis.ts (~100 lines)
#    See checklist for full code

# 3. Wire it up in your router
const store = process.env.SESSION_STORE_TYPE === 'redis'
  ? new RedisSessionStore({ advanceState })
  : new MemorySessionStore({ advanceState });

# 4. Add env vars
echo "REDIS_URL=redis://..." >> .env.local
echo "SESSION_STORE_TYPE=redis" >> .env.local

# 5. Test
SESSION_STORE_TYPE=redis npm run dev
# Create session, restart server, verify persistence
```

## Philosophy

**Start Simple, Iterate Fast**

1. **MVP First** (Today): Basic persistence with graceful fallback
2. **Strengthen Gradually** (Week 2-3): Add features as needed
3. **Production Hardening** (Week 4+): Metrics, monitoring, load testing

**No premature optimization!** Add complexity only when you hit real problems.

## TODOs Sprinkled Throughout

The code includes `// TODO` comments for future enhancements:

- Optimistic locking (WATCH + MULTI/EXEC) - when you see race conditions
- Pub/Sub for multiplayer - when you add cross-instance support
- Connection retry logic - when you see connection drops
- Schema validation - when you see deserialization errors
- Metrics and monitoring - when deploying to production

## File Structure

```
docs/
├── README-REDIS.md                      # THIS FILE (overview)
├── redis-implementation-checklist.md   # ⭐ START HERE (step-by-step)
├── redis-session-store.md              # Full design doc (reference)
└── redis-architecture-summary.md       # Diagrams and quick ref

server/
├── lib/
│   └── redisClient.ts                  # ~30 lines (create this)
└── stores/
    ├── sessionStore.ts                 # Interface (existing)
    ├── sessionStore.memory.ts          # Memory impl (existing)
    └── sessionStore.redis.ts           # ~100 lines (create this)
```

## Success Criteria (MVP)

- ✅ npm install completes
- ✅ Server starts without errors
- ✅ Can create session
- ✅ Session persists after restart
- ✅ Gracefully falls back to memory on errors

**Total time: 1-2 hours**

## Need Help?

1. Check the [Checklist](./redis-implementation-checklist.md) for step-by-step instructions
2. See [Architecture Summary](./redis-architecture-summary.md) for troubleshooting
3. Read [Full Design](./redis-session-store.md) for detailed explanations

## Next Steps

After MVP is working:
- Test with real game sessions
- Deploy to preview environment
- Monitor for issues
- Add features as needed (see TODOs in code)

---

**Remember**: Don't build what you don't need yet. Get the MVP working, then iterate!
