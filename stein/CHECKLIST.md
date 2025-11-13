# Stein Migration Checklist

**Goal:** Replace flaky SSE with Colyseus WebSocket in minimal steps

## ✅ Phase 1: Set Up Stein Service (30 min)

- [ ] `cd stein && npm install`
- [ ] `cp .env.example .env` and configure
- [ ] Copy or symlink `../server` → `./server`
- [ ] `npm run dev` - verify it starts on port 2567
- [ ] Visit `http://localhost:2567/health` - should return `{"status":"ok"}`

## ✅ Phase 2: Update Next.js Client (1-2 hours)

- [ ] `npm install colyseus.js` (in Next.js root)
- [ ] Add `NEXT_PUBLIC_STEIN_URL=ws://localhost:2567` to `.env.local`
- [ ] Find where you use `SessionService` or `sessionClient`
- [ ] Replace with `ColyseusGameClient` (see `services/colyseusClient.ts`)

### Key Code Changes

**Before:**
```typescript
const snapshot = await SessionService.create({ mode, setup });
const eventSource = new EventSource(`/api/session/${id}/stream`);
eventSource.addEventListener('session', (e) => { /* ... */ });
```

**After:**
```typescript
const client = await ColyseusGameClient.create(setup);
client.onStateChange((state) => { /* ... */ });
```

## ✅ Phase 3: Remove SSE Code (30 min)

- [ ] Delete `components/SessionMonitor.tsx` (if SSE-only)
- [ ] Remove all `EventSource` usage
- [ ] Remove SSE error handling code
- [ ] Remove manual reconnection logic

## ✅ Phase 4: Test (1 hour)

### Start Both Services
```bash
# Terminal 1
cd stein && npm run dev

# Terminal 2
npm run dev
```

### Test Checklist
- [ ] Create new game - should connect via WebSocket
- [ ] Submit actions - state updates automatically
- [ ] Refresh page - reconnection works
- [ ] Advance round - progress events show up
- [ ] Check browser console - no SSE errors
- [ ] Check Stein logs - see GameRoom events

## ✅ Phase 5: Deploy (Production)

### Stein
- [ ] Deploy Stein to Cloud Run (or similar)
- [ ] Enable Redis for SESSION_STORE_TYPE=redis
- [ ] Note deployed WebSocket URL

### Next.js
- [ ] Update `NEXT_PUBLIC_STEIN_URL` to production Stein URL
- [ ] Redeploy Next.js app
- [ ] Test production game flow

## Common Issues

**WebSocket fails to connect**
→ Check CORS_ORIGIN in Stein's .env matches Next.js URL

**State not updating**
→ Verify `onStateChange` callback is registered

**"Room not found" error**
→ Create new session instead of trying to join stale one

## Success Metrics

✅ No more `EventSource` errors in console
✅ State updates happen automatically on actions
✅ Reconnection works without manual handling
✅ Game feels more responsive
✅ Easier to debug (Colyseus logs are clear)

## Rollback Plan

If something goes wrong:
1. Keep Stein code as-is (it's isolated)
2. Revert Next.js client changes to use SSE again
3. Debug issue, try again later

**Your business logic is unchanged** - rolling back is just a client-side code change.

---

**Estimated Total Time:** 3-5 hours (including testing)

**Files Changed:** ~3-5 files in Next.js client (hooks, services)

**Files Unchanged:** All of `server/`, all components, all game logic
