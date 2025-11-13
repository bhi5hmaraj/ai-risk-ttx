# Stein Migration Guide: Minimal Path from Next.js SSE to Colyseus

This guide shows the **absolute minimal steps** to replace your flaky SSE implementation with Colyseus while keeping your Next.js app mostly unchanged.

## What This Changes

**Before (SSE):**
- Client opens EventSource to `/api/session/:id/stream`
- Server sends JSON snapshots over SSE
- Client polls or makes HTTP POST for actions
- Connection management is manual and flaky

**After (Colyseus):**
- Client connects via WebSocket to Stein service
- Colyseus handles all connection management, reconnection, state syncing
- No more SSE, no more manual connection handling
- Your business logic (SessionStore, sessionEngine) stays exactly the same

## Architecture

```
Next.js App (localhost:3000)          Stein Service (localhost:2567)
├─ SSR pages                         ├─ Express + Colyseus
├─ React components                  ├─ GameRoom (WebSocket)
├─ Zustand stores                    ├─ server/ (your existing logic)
├─ Auth/feedback APIs                │   ├─ stores/sessionStore
└─ ColyseusGameClient ──────────────→│   ├─ services/sessionEngine
    (replaces sessionClient.ts)      │   └─ services/llmService
                                     └─ No SSE, just WebSocket
```

## Step 1: Copy Server Logic to Stein

```bash
cd stein
npm install

# Copy your server logic (or symlink for dev)
cp -r ../server ./server

# Or use symlink during development
ln -s ../server ./server
```

## Step 2: Start Stein Service

```bash
cd stein
cp .env.example .env
# Edit .env with your settings

npm run dev
```

You should see:
```
🎮 Stein server listening on http://localhost:2567
📡 Colyseus WebSocket: ws://localhost:2567
```

## Step 3: Update Next.js to Use Colyseus Client

### 3a. Install Colyseus Client in Next.js App

```bash
cd ..  # Back to Next.js root
npm install colyseus.js
```

### 3b. Add Stein URL to .env

```bash
# .env.local
NEXT_PUBLIC_STEIN_URL=ws://localhost:2567
```

### 3c. Update Your Game Hook

Find where you currently use `sessionClient` and replace with `colyseusClient`:

**Before (services/sessionClient.ts):**
```typescript
import { SessionService } from './sessionClient';

// Create session
const snapshot = await SessionService.create({ mode, setup });
await SessionService.initialize(snapshot.id);

// Subscribe to updates via SSE
const eventSource = new EventSource(`/api/session/${id}/stream`);
eventSource.addEventListener('session', (e) => {
  const data = JSON.parse(e.data);
  // Update state...
});
```

**After (services/colyseusClient.ts):**
```typescript
import { ColyseusGameClient } from './colyseusClient';

// Create session (WebSocket connection automatic!)
const client = await ColyseusGameClient.create(setup, userId);

// Subscribe to state changes (replaces SSE)
client.onStateChange((state) => {
  // Update your Zustand store
  gameStore.setState({
    phase: state.phase,
    round: state.round,
    players: Array.from(state.players.values()),
    // ...
  });
});

// Subscribe to progress events
client.onProgress((payload) => {
  // Update progress UI
  console.log('AI progress:', payload);
});

// All actions now go through WebSocket
await client.initialize(humanRoleName);
await client.submitActions(playerId, actions);
await client.advanceRound(hostToken, context);
```

## Step 4: Update Hooks/useGameActions.ts

Find your `useGameActions` hook (or wherever you call `SessionService`):

```typescript
// hooks/useGameActions.ts

import { ColyseusGameClient } from '@/services/colyseusClient';

export function useGameActions() {
  const [client, setClient] = useState<ColyseusGameClient | null>(null);

  const startGame = async (setup: GameSetup) => {
    // Create Colyseus client
    const newClient = await ColyseusGameClient.create(setup, 'human_player');

    // Subscribe to state changes
    newClient.onStateChange((state) => {
      // Update your Zustand stores
      gameStore.setState({
        phase: state.phase,
        round: state.round,
        revision: state.revision,
        coreMetric: {
          name: state.coreMetricName,
          value: state.coreMetricValue,
        },
        players: Array.from(state.players.values()).map(p => ({
          id: p.id,
          role: { name: p.roleName },
          isHuman: p.isHuman,
          hasSubmitted: p.hasSubmitted,
          hiddenScore: p.hiddenScore,
          actionPoints: p.actionPoints,
        })),
      });
    });

    // Subscribe to progress
    newClient.onProgress((payload) => {
      // Update progress UI state
      uiStore.setState({ progress: payload });
    });

    setClient(newClient);

    // Initialize game
    await newClient.initialize(humanRoleName);
  };

  const submitActions = async (playerId: string, actions: ActionOption[]) => {
    if (!client) throw new Error('Not connected');
    await client.submitActions(playerId, actions);
  };

  const advanceRound = async (hostToken: string, context: any) => {
    if (!client) throw new Error('Not connected');
    await client.advanceRound(hostToken, context);
  };

  return { startGame, submitActions, advanceRound, client };
}
```

## Step 5: Remove SSE Components

Delete or disable these files:
- `components/SessionMonitor.tsx` (if it's just for SSE)
- Any `EventSource` usage in hooks
- SSE-specific error handling code

**The beauty:** All that connection management, reconnection, state diffing - Colyseus handles it. You just subscribe to state changes.

## Step 6: Test It

### Start Both Services

```bash
# Terminal 1: Stein
cd stein
npm run dev

# Terminal 2: Next.js
npm run dev
```

### Navigate to your game
1. Go to `http://localhost:3000`
2. Start a game
3. Watch browser console: You should see `[ColyseusClient] Session created`
4. Check Stein logs: You should see `[GameRoom] Created`

### What to Look For

✅ **No more SSE errors** in browser console
✅ **State updates happen automatically** when actions are submitted
✅ **Reconnection works** (try refreshing page)
✅ **Progress events** show up during AI turns

## Minimal Code Changes Summary

**Files you need to change:**
1. `hooks/useGameActions.ts` (or equivalent) - swap `SessionService` for `ColyseusGameClient`
2. Remove `components/SessionMonitor.tsx` (if SSE-only)
3. Add `NEXT_PUBLIC_STEIN_URL` to `.env.local`

**Files that stay the same:**
- ✅ All your `server/` logic (stores, services, types)
- ✅ All your React components
- ✅ All your Zustand stores
- ✅ All your game rules and LLM integration
- ✅ All your tests (business logic unchanged)

## Deployment

### Development
- Next.js: `npm run dev` (port 3000)
- Stein: `cd stein && npm run dev` (port 2567)

### Production (Cloud Run example)

**Deploy Next.js:**
```bash
# Keep on Vercel or move to Cloud Run
vercel deploy
```

**Deploy Stein:**
```bash
cd stein
gcloud run deploy stein \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="SESSION_STORE_TYPE=redis,REDIS_URL=redis://your-redis-url"
```

Update `NEXT_PUBLIC_STEIN_URL` to point to your Cloud Run Stein URL.

## Troubleshooting

### "WebSocket connection failed"
- Check Stein is running on port 2567
- Check CORS_ORIGIN in Stein's .env matches Next.js URL
- Check firewall/network settings

### "State not updating"
- Check browser console for Colyseus connection logs
- Check Stein server logs for room events
- Verify `onStateChange` callback is registered

### "Room not found"
- SessionId might be stale
- Try creating new session instead of joining

## Benefits You Get

✅ **No more manual connection handling** - Colyseus does it
✅ **Automatic reconnection** - built-in with state recovery
✅ **Binary state patches** - bandwidth savings (only changed data sent)
✅ **Deterministic state sync** - no more race conditions
✅ **Better debugging** - Colyseus devtools available

## What You Keep

✅ **All your business logic** - SessionStore, sessionEngine unchanged
✅ **All your tests** - game rules testing still works
✅ **Your existing architecture** - just swapped transport layer
✅ **Type safety** - Colyseus schemas are typed

---

**Time estimate:** 2-3 hours for initial migration, 1-2 days for testing/polish

**Difficulty:** Low - mostly find/replace of client code

**Risk:** Low - business logic unchanged, easy to revert if needed
