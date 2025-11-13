# Colyseus Migration Guide - Approach 2 (Custom Server)

**Decision:** Custom Next.js server with Colyseus (Milestone 1 only)

**Timeline:** 1-2 days to ship, 1 week to polish

**Why this approach:**
- ✅ Ships fastest (no service extraction needed)
- ✅ Simplest architecture (one service, one deployment)
- ✅ Fewest bugs (no cross-service networking)
- ✅ Focus on gameplay/UI polish (not infrastructure)
- ✅ Matrix is "good to have," not "must have"

---

## What Was Created

```
✅ server.ts                      # Custom Next.js + Colyseus server
✅ game-server/                   # Self-contained game logic
   ├── rooms/GameRoom.ts         # Main game room
   ├── schemas/GameState.ts      # Auto-synced state
   └── lib/ai.ts                 # AI service (reuses existing LLM)
✅ hooks/useGameRoom.ts           # React hook for WebSocket
✅ services/colyseusClient.ts    # Standalone client (if not using hook)
```

---

## Installation Steps

### 1. Install Dependencies

```bash
npm install @colyseus/core @colyseus/schema @colyseus/ws-transport colyseus.js
```

### 2. Update package.json Scripts

Replace your `dev` and `start` scripts:

```json
{
  "scripts": {
    "dev": "tsx watch server.ts",
    "dev:next": "next dev",
    "build": "next build",
    "start": "NODE_ENV=production tsx server.ts",
    "start:next": "next start"
  }
}
```

### 3. Add Environment Variable

```bash
# .env.local
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

---

## Usage in Your Pages

### Example: Update Game Page

```typescript
// pages/game.tsx or app/game/page.tsx

'use client'; // If using App Router

import { useGameRoom } from '@/hooks/useGameRoom';
import { useEffect, useState } from 'react';

export default function GamePage() {
  const [role, setRole] = useState('Election Commissioner');
  const [setup, setSetup] = useState(null); // Your GameSetup

  const {
    gameState,
    connected,
    error,
    hostToken,
    initialize,
    getActionOptions,
    submitActions,
    advanceRound,
    sendChat
  } = useGameRoom({
    role,
    setup,
    onStateChange: (state) => {
      console.log('Game state updated:', state);
      // Update your Zustand stores here if needed
    },
    onProgress: (payload) => {
      console.log('Progress:', payload);
      // Update progress UI
    },
  });

  // Wait for connection
  if (!connected) return <div>Connecting to game...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!gameState) return <div>Loading game state...</div>;

  // Initialize game when setup is ready
  useEffect(() => {
    if (connected && setup && gameState.phase === 'LOBBY') {
      initialize(role);
    }
  }, [connected, setup, gameState?.phase]);

  // Your existing game UI
  return (
    <div>
      <h1>Round {gameState.round}</h1>
      <p>{gameState.coreMetricName}: {gameState.coreMetricValue}</p>

      {/* Players list */}
      <div>
        {Array.from(gameState.players.values()).map((player: any) => (
          <div key={player.id}>
            {player.roleName} {player.hasSubmitted ? '✓' : '○'}
          </div>
        ))}
      </div>

      {/* Action submission */}
      <button onClick={async () => {
        const options = await getActionOptions('human_player', role);
        console.log('Options:', options);
        // Show options to user, let them select
        // Then submit:
        submitActions('human_player', [options[0]]);
      }}>
        Get Actions
      </button>

      {/* Advance round (host only) */}
      {hostToken && (
        <button onClick={() => {
          advanceRound({
            humanRoleName: role,
            humanPlayerId: 'human_player',
            humanActions: [], // Selected actions
            humanAvailableOptions: [], // Available options
          });
        }}>
          Advance Round
        </button>
      )}

      {/* Chat */}
      <div>
        <input
          type="text"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              sendChat(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          placeholder="Type to chat..."
        />
        {gameState.messages.map((msg: any, i: number) => (
          <div key={i}>{msg.from}: {msg.text}</div>
        ))}
      </div>
    </div>
  );
}
```

---

## Migration Checklist

### Phase 1: Get It Running (2-3 hours)

- [ ] Install Colyseus packages
- [ ] Update `package.json` scripts
- [ ] Run `npm run dev` - verify both Next.js and Colyseus start
- [ ] Test WebSocket connection in browser console:
  ```javascript
  const { Client } = require('colyseus.js');
  const client = new Client('ws://localhost:3000');
  const room = await client.create('game', { role: 'governor' });
  console.log('Room ID:', room.id);
  ```

### Phase 2: Update One Page (4-6 hours)

- [ ] Update lobby page to use `useGameRoom`
- [ ] Update game page to connect on mount
- [ ] Test: Can create room, see state updates
- [ ] Remove old SSE code from that page

### Phase 3: Full Game Flow (8-12 hours)

- [ ] Initialize game from lobby
- [ ] Get action options (test AI call works)
- [ ] Submit human actions
- [ ] Advance round (test full AI pipeline)
- [ ] Display event log and messages
- [ ] Handle game end state

### Phase 4: Remove Old SSE Code (2-4 hours)

- [ ] Delete `components/SessionMonitor.tsx` (if SSE-only)
- [ ] Remove all `EventSource` usage
- [ ] Remove manual reconnection logic
- [ ] Clean up unused API routes (`/api/session/*/stream`)

### Phase 5: Test & Polish (4-8 hours)

- [ ] Test with 2+ browser tabs (multiplayer)
- [ ] Test reconnection (refresh page mid-game)
- [ ] Test error states (disconnect, timeout)
- [ ] Add loading states
- [ ] Add error UI

---

## Testing Locally

### Start Server

```bash
npm run dev
```

You should see:
```
> Next.js + Colyseus ready on http://localhost:3000
> WebSocket available at ws://localhost:3000
```

### Test WebSocket in Browser Console

```javascript
// Connect to room
const { Client } = require('colyseus.js');
const client = new Client('ws://localhost:3000');
const room = await client.create('game', {
  role: 'Election Commissioner',
  setup: {
    scenarioTitle: 'Test Scenario',
    scenarioDescription: 'Test',
    coreMetric: { name: 'Trust', description: 'Public trust', value: 50 },
    stakeholders: [
      {
        name: 'Election Commissioner',
        icon: '🗳️',
        publicObjective: 'Test',
        hiddenObjective: 'Test',
        resources: [],
        constraints: []
      }
    ],
    maxRounds: 5,
    maxAIPlayers: 5
  }
});

console.log('Connected to room:', room.id);

// Watch state changes
room.onStateChange((state) => {
  console.log('State updated:', state.toJSON());
});

// Initialize game
room.send('initialize', { humanRoleName: 'Election Commissioner' });

// Send chat
room.send('chat', { text: 'Hello world!' });
```

### Test with Multiple Clients

Open 2 browser tabs, join same room by ID:

```javascript
// Tab 1
const room1 = await client.create('game', { role: 'Governor' });
console.log('Room ID:', room1.id); // e.g., "abc123"

// Tab 2
const room2 = await client.joinById('abc123', { role: 'Tech CEO' });
console.log('Joined room:', room2.id);

// Send chat from Tab 1
room1.send('chat', { text: 'Hi from Tab 1' });

// Tab 2 will receive it automatically!
```

---

## Deployment (Cloud Run)

### Update Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci
RUN npx prisma generate

# Copy source
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Start custom server (not "next start"!)
CMD ["npm", "start"]
```

### Deploy

```bash
gcloud run deploy simulacra \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances=1 \
  --set-env-vars="VITE_LITELLM_API_KEY=xxx,VITE_LLM_MODEL=gemini-2.5-flash"
```

**Important:** Set `--min-instances=1` to avoid cold starts on WebSocket connections.

### Update Client

```bash
# .env.production
NEXT_PUBLIC_WS_URL=wss://simulacra-xxx.run.app
```

---

## Troubleshooting

### "WebSocket connection failed"
- Check server is running: `curl http://localhost:3000/health` (if you add health endpoint)
- Check WebSocket URL matches server port
- Check firewall/network settings

### "State not updating"
- Open browser console, check for Colyseus connection logs
- Check server logs for room events
- Verify `onStateChange` callback is registered

### "Room not found"
- Room IDs are ephemeral (lost on server restart in development)
- Create new room instead of trying to join stale ID

### "Can't import from server/"
- Check `tsconfig.json` includes server folder
- Use relative imports: `import { ... } from '../../server/...'`

---

## Future: Extraction to Stein (Milestone 2)

If/when you need Matrix service:

1. **Copy game-server folder to new Stein service**
   ```bash
   mkdir stein && cd stein
   cp -r ../game-server ./src
   ```

2. **Add Express wrapper** (5 min)

3. **Replace AI calls with Matrix calls** (game-server/lib/ai.ts)

4. **Update Next.js WS URL** (NEXT_PUBLIC_WS_URL → ws://stein-url)

Total time: < 1 day to extract.

---

## Success Metrics

After 1-2 days, you should have:
- ✅ Game works end-to-end via WebSocket
- ✅ No more SSE errors in console
- ✅ Multiplayer chat works
- ✅ State updates feel responsive
- ✅ Reconnection works (refresh page)
- ✅ Easier to debug than SSE

After 1 week, you should know:
- ✅ Is Colyseus the right choice? (subjective but important)
- ✅ Do users want more features? (gameplay vs autonomous AI)
- ✅ Should you invest in Matrix? (or focus on polish)

---

## Getting Help

**Documentation:**
- [Colyseus Docs](https://docs.colyseus.io/)
- [Colyseus State Management](https://docs.colyseus.io/colyseus/state/schema/)
- [Next.js Custom Server](https://nextjs.org/docs/pages/building-your-application/configuring/custom-server)

**Files to know:**
- `server.ts` - Server entry point
- `game-server/rooms/GameRoom.ts` - All game logic
- `game-server/schemas/GameState.ts` - What syncs to clients
- `hooks/useGameRoom.ts` - React integration

**Common patterns:**
- Add new message type: Add `this.onMessage()` handler in GameRoom
- Add new state field: Add `@type()` decorator in GameState
- Call AI: Use functions from `game-server/lib/ai.ts`
