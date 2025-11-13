# Stein - Simulacra Game Server

**Stein** is the Colyseus-based game server for Simulacra. It replaces the SSE-based real-time communication with WebSockets, providing reliable connection management and automatic state synchronization.

## Why Stein?

Your Next.js app with SSE was flaky and hard to debug. Stein abstracts away all the connection management:

- ✅ **Automatic reconnection** with state recovery
- ✅ **Binary state patches** (only changed data sent)
- ✅ **Built-in room lifecycle management**
- ✅ **No manual WebSocket handling**
- ✅ **Battle-tested** (used in production games)

**Key insight:** Your business logic (`server/stores`, `server/services`) stays exactly the same. Stein is just a better transport layer.

## Architecture

```
Stein Service
├── Express HTTP Server
│   ├── Health check endpoint
│   └── CORS middleware
├── Colyseus Game Server
│   └── GameRoom (WebSocket handler)
└── Your Existing Logic
    ├── server/stores/sessionStore (Memory/Redis)
    ├── server/services/sessionEngine
    ├── server/services/llmService
    └── server/types/*
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Start Server

```bash
npm run dev
```

You should see:
```
🎮 Stein server listening on http://localhost:2567
📡 Colyseus WebSocket: ws://localhost:2567
🏥 Health check: http://localhost:2567/health
```

## How It Works

### 1. Client Creates Room

```typescript
import { ColyseusGameClient } from './colyseusClient';

const client = await ColyseusGameClient.create(gameSetup, userId);
```

### 2. Colyseus Creates GameRoom

```typescript
// GameRoom.onCreate() in src/rooms/GameRoom.ts
const snapshot = await store.create({ state, setup });
this.sessionId = snapshot.id;
```

### 3. GameRoom Reuses Your SessionStore

```typescript
// Your existing store!
const store = new MemorySessionStore({ advanceState });

// Or Redis
const store = new RedisSessionStore({ advanceState });
```

### 4. SessionStore Publishes Updates

```typescript
// When state changes (in your existing code)
store.publish(sessionId, { type: 'update', snapshot });
```

### 5. GameRoom Syncs to Colyseus State

```typescript
// GameRoom subscribes and syncs
store.subscribe(sessionId, (event) => {
  this.syncFromSnapshot(event.snapshot);
  // Colyseus automatically broadcasts to all clients!
});
```

### 6. Client Receives Updates Automatically

```typescript
// No manual EventSource management!
client.onStateChange((state) => {
  console.log('State updated:', state);
});
```

## Project Structure

```
stein/
├── src/
│   ├── index.ts              # Express + Colyseus setup
│   ├── rooms/
│   │   └── GameRoom.ts       # Main game room (delegates to SessionStore)
│   └── schemas/
│       └── GameState.ts      # Colyseus state schema
├── server/                   # Your existing server logic (copied or symlinked)
│   ├── stores/
│   ├── services/
│   └── types/
├── package.json
├── tsconfig.json
└── .env
```

## Environment Variables

```bash
# Server
PORT=2567                      # Colyseus server port
SESSION_STORE_TYPE=memory      # or 'redis'
REDIS_URL=redis://...          # If using Redis

# CORS
CORS_ORIGIN=http://localhost:3000  # Next.js app URL

# LLM (same as Next.js app)
VITE_LITELLM_API_KEY=...
VITE_LLM_MODEL=gemini-2.5-flash

# Database
DATABASE_URL=postgresql://...
```

## Development

### Run Locally

```bash
npm run dev
```

Stein uses `tsx watch` so it auto-reloads on file changes.

### With Next.js App

```bash
# Terminal 1: Stein
cd stein
npm run dev

# Terminal 2: Next.js
cd ..
npm run dev
```

## Production Deployment

### Build

```bash
npm run build
```

### Start

```bash
npm start
```

### Deploy to Cloud Run

```bash
gcloud run deploy stein \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="SESSION_STORE_TYPE=redis,REDIS_URL=redis://your-redis-url"
```

Update `NEXT_PUBLIC_STEIN_URL` in your Next.js app to point to the deployed URL.

## API Reference

### WebSocket Messages (Client → Server)

**initialize**
```json
{ "humanRoleName": "Election Commissioner" }
```

**get_action_options**
```json
{
  "playerId": "human_player",
  "roleName": "Election Commissioner",
  "revision": 5
}
```

**submit_actions**
```json
{
  "playerId": "human_player",
  "actions": [{ "title": "...", "description": "...", "cost": 1 }],
  "revision": 5
}
```

**advance_round**
```json
{
  "hostToken": "secret-host-token",
  "revision": 5,
  "context": {
    "humanRoleName": "Election Commissioner",
    "humanPlayerId": "human_player",
    "humanActions": [...],
    "humanAvailableOptions": [...]
  }
}
```

### WebSocket Messages (Server → Client)

**State changes** (automatic via Colyseus)
- Client receives binary patches whenever state changes
- No manual message parsing needed!

**progress**
```json
{ "role": "Tech CEO", "stage": "ai-turn" }
```

**action_options**
```json
{ "options": [{ "title": "...", "description": "...", "cost": 1 }] }
```

**error**
```json
{ "message": "Invalid host token" }
```

## Testing

### Health Check

```bash
curl http://localhost:2567/health
# Should return: {"status":"ok","service":"stein"}
```

### WebSocket Connection

```bash
npm install -g wscat
wscat -c ws://localhost:2567
# Should connect successfully
```

## Troubleshooting

### Port already in use
```bash
# Kill process on port 2567
lsof -ti:2567 | xargs kill -9
```

### Can't import from ../server
Make sure `server/` directory exists in parent or is symlinked:
```bash
ln -s ../server ./server
```

### Redis connection failed
Check `REDIS_URL` is correct and Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

## Differences from Next.js SSE Approach

| Feature | SSE (Old) | Colyseus (New) |
|---------|-----------|----------------|
| Transport | HTTP + EventSource | WebSocket |
| Connection Management | Manual | Automatic |
| Reconnection | Manual retry logic | Built-in with state recovery |
| State Sync | Full JSON snapshots | Binary patches (diff) |
| Bandwidth | High (full state each time) | Low (only changes) |
| Debugging | Hard (black magic) | Easy (Colyseus devtools) |
| Browser Support | EventSource limitations | Standard WebSocket |
| State Synchronization | Manual JSON parsing | Automatic via Colyseus Schema |

## What Stays the Same

✅ **All your business logic** - SessionStore, sessionEngine, llmService unchanged
✅ **All your game rules** - scoring, round progression, AI turns
✅ **All your tests** - unit tests for game logic still work
✅ **Your type system** - same TypeScript types
✅ **Your database schema** - Prisma models unchanged

**Only the transport layer changed.** That's it.

## Next Steps

1. Read [MIGRATION.md](./MIGRATION.md) for step-by-step migration guide
2. Start Stein server locally
3. Update Next.js client to use `ColyseusGameClient`
4. Test the full game flow
5. Deploy to production

## Resources

- [Colyseus Docs](https://docs.colyseus.io/)
- [Colyseus Schema](https://docs.colyseus.io/colyseus/state/schema/)
- [Cloud Run WebSocket Support](https://cloud.google.com/run/docs/triggering/websockets)
