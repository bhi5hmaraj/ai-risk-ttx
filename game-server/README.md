# Game Server

**Self-contained Colyseus game server logic**

This folder contains all game server logic and can be extracted to a separate service (Stein) in the future if needed.

## Structure

```
game-server/
├── rooms/
│   └── GameRoom.ts          # Main game room (handles all game logic)
├── schemas/
│   └── GameState.ts         # Colyseus state schema (auto-synced to clients)
└── lib/
    └── ai.ts                # AI service (calls LLM, can be replaced with Matrix)
```

## Current Setup (Milestone 1)

**Architecture:**
```
Next.js Custom Server (server.ts)
├─ Next.js HTTP Routes      (pages/api/*, SSR)
└─ Colyseus WebSocket       (game-server/)
   └─ GameRoom
      └─ Direct LLM calls   (game-server/lib/ai.ts → server/services/llm/*)
```

**How it works:**
1. `server.ts` starts Next.js and attaches Colyseus to same HTTP server
2. Clients connect via WebSocket to `ws://localhost:3000`
3. GameRoom handles all game logic (join, actions, round progression)
4. AI calls go directly to LLM (via existing `server/services/llm/`)
5. State automatically syncs to all clients (Colyseus magic!)

## Future Extraction (Milestone 2)

If you need autonomous AI agents (Matrix service), extract like this:

### Step 1: Copy to Stein Service

```bash
# Create new Stein service
mkdir stein
cd stein
npm init -y

# Copy game-server folder
cp -r ../game-server ./src

# Copy server types/services (dependencies)
cp -r ../server ./server
```

### Step 2: Add Express Wrapper

```typescript
// stein/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './src/rooms/GameRoom';

const app = express();
const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define('game', GameRoom);

httpServer.listen(2567, () => {
  console.log('Stein server listening on ws://localhost:2567');
});
```

### Step 3: Replace AI Calls with Matrix

```typescript
// game-server/lib/ai.ts (in Stein service)

export async function generateAITurn(player, gameState, previousActions) {
  // NEW: Call Matrix service
  if (process.env.USE_MATRIX === '1') {
    const response = await fetch(`${MATRIX_URL}/intelligence/agents/${player.role}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player, gameState, previousActions }),
    });
    return response.json();
  }

  // FALLBACK: Direct LLM call (existing code)
  return getService().generateAITurn(player, gameState, previousActions);
}
```

### Step 4: Update Next.js Client

```typescript
// In Next.js app, just change WebSocket URL
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:2567';
```

That's it! Game logic unchanged, just extracted to separate service.

## Why This Structure Works

**Benefits now (Milestone 1):**
- ✅ All code in one place (easy to debug)
- ✅ No network calls between services (fast, reliable)
- ✅ Simple deployment (one Docker image)
- ✅ Easy to test locally

**Benefits later (Milestone 2):**
- ✅ Clean extraction path (copy folder, add wrapper)
- ✅ No rewrites needed (just change AI call destination)
- ✅ Game logic stays testable (same code, different deployment)

## Testing

### Unit Tests (Future)
```typescript
// Test game logic without Colyseus
import { GameRoom } from './rooms/GameRoom';

test('advancing round updates score', () => {
  // Mock AI responses, test game rules
});
```

### Integration Tests
```typescript
// Test with real Colyseus client
import { Client } from 'colyseus.js';

test('full game flow', async () => {
  const client = new Client('ws://localhost:3000');
  const room = await client.create('game', { role: 'governor' });
  // ... test game flow
});
```

## Key Files to Know

**GameRoom.ts** - All game logic lives here
- `onCreate()` - Room initialization
- `handleInitialize()` - Start game with full roster
- `handleGetActionOptions()` - Generate action options (calls AI)
- `handleSubmitActions()` - Player submits actions
- `handleAdvanceRound()` - Run full round (counterfactual + AI turns + consequences)
- `handleChat()` - Human-to-human chat

**GameState.ts** - State schema (auto-synced to clients)
- Defines what data is sent to clients
- Uses Colyseus decorators (`@type()`)
- Changes automatically broadcast to all connected clients

**ai.ts** - AI service abstraction
- Thin wrapper around existing LLM services
- Can be replaced with Matrix calls later
- No game logic (just calls)

## Environment Variables

```bash
# LLM settings (same as Next.js)
VITE_LITELLM_API_KEY=your_key
VITE_LLM_MODEL=gemini-2.5-flash

# Mock mode for testing
LLM_MOCK=1

# Future: Matrix service
USE_MATRIX=1
MATRIX_URL=http://localhost:8000
```

## Development

```bash
# Start dev server (Next.js + Colyseus)
npm run dev

# Test WebSocket connection
node -e "
const { Client } = require('colyseus.js');
const client = new Client('ws://localhost:3000');
client.create('game', { role: 'governor' }).then(room => {
  console.log('Connected to room:', room.id);
  room.onStateChange(state => console.log('State:', state.toJSON()));
});
"
```

## Deployment

### Current (Milestone 1) - Single Service

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Deploy to Cloud Run
gcloud run deploy simulacra \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

### Future (Milestone 2) - Separate Stein

Deploy Stein separately, update `NEXT_PUBLIC_WS_URL` in Next.js to point to Stein.

---

**Current status:** Milestone 1 (custom server)
**Extraction ready:** Yes (< 1 day to extract)
**Matrix needed:** Not yet (validate Colyseus first)
