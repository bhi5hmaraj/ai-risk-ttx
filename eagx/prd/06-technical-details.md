## Technical Implementation Details

### Room Code Generation

```typescript
// lib/roomCodes.ts
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Collision detection (unlikely but handle it)
async function createUniqueRoom(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateRoomCode();
    const existing = await db.room.findUnique({ where: { code } });
    if (!existing) return code;
    attempts++;
  }
  throw new Error('Failed to generate unique room code');
}
```

**Collision Probability:**
- 6 characters from 32-char set = 32^6 = 1.07 billion combinations
- With 100 active rooms, collision probability < 0.00001%

---

### Feature Flag Implementation

```typescript
// lib/featureFlags.ts
export function shouldUseColyseus(): boolean {
  // Server-side: Env var controls rollout percentage
  const rollout = parseInt(process.env.COLYSEUS_ROLLOUT_PERCENT || '0');

  // Consistent per-user (based on session cookie)
  const userId = getUserId(); // From session
  const hash = simpleHash(userId);

  return (hash % 100) < rollout;
}

// In page component
export default function GamePage() {
  const useColyseus = shouldUseColyseus();

  if (useColyseus) {
    return <ColyseusGameScreen />;
  } else {
    return <SSEGameScreen />;  // Keep old code working
  }
}
```

**Rollout Schedule:**
- Week 3, Day 13: `COLYSEUS_ROLLOUT_PERCENT=10`
- Week 3, Day 14: `COLYSEUS_ROLLOUT_PERCENT=50` (if <1% errors)
- Week 4, Day 18: `COLYSEUS_ROLLOUT_PERCENT=100` or `0` (GO/NO-GO decision)

---

### Colyseus Admin API (Express)

```typescript
// server/routes/admin.ts (excerpt)
import { Router } from 'express';
import { matchMaker } from 'colyseus';

const router = Router();

router.get('/rooms', requireAdmin, async (_req, res) => {
  const rooms = await matchMaker.query({ name: 'game' });
  const data = rooms.map((room: any) => ({
    roomId: room.roomId,
    code: room.metadata?.code,
    clients: room.clients,
    createdAt: room.createdAt,
  }));
  res.json({ rooms: data });
});
```

**Admin Pages:**
- `/admin` - Login with password
- `/colyseus-admin/rooms` - List all active games
- `/colyseus-admin/rooms/[id]` - Detailed view of specific game
- `/admin/logs` - Real-time logs (filtered by roomId)

---

### Database Persistence Strategy

**Decision:** Snapshot game state every round + on disposal

```typescript
class GameRoom extends Room<GameState> {

  async onDispose() {
    // Save final state when room closes
    await db.game.create({
      data: {
        roomCode: this.metadata.code,
        finalState: this.state.toJSON(),
        completedAt: new Date(),
        players: this.state.players.size,
        rounds: this.state.round,
      }
    });
  }

  async advanceRound() {
    this.state.round++;

    // Snapshot every 2 rounds (or on game end)
    if (this.state.round % 2 === 0 || this.state.phase === 'end') {
      await this.persistState();
    }
  }

  private async persistState() {
    try {
      await db.gameSnapshot.upsert({
        where: { roomId: this.roomId },
        update: { state: this.state.toJSON(), updatedAt: new Date() },
        create: { roomId: this.roomId, state: this.state.toJSON() }
      });
    } catch (error) {
      // Don't crash room if DB write fails
      console.error('Failed to persist state:', error);
    }
  }
}
```

**Recovery on Reconnect:**
- If player disconnects and reconnects to existing room → Colyseus handles (built-in)
- If room crashes and needs to restart → load from last snapshot (lose 1 round max)

---

### Structured Logging

```typescript
// lib/logger.ts
export const logger = {
  game: (roomId: string, event: string, data?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      type: 'game',
      roomId,
      event,
      ...data,
      timestamp: Date.now()
    }));
  },

  connection: (roomId: string, sessionId: string, event: string, data?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      type: 'connection',
      roomId,
      sessionId,
      event,
      ...data,
      timestamp: Date.now()
    }));
  },

  error: (context: string, error: Error, data?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      context,
      message: error.message,
      stack: error.stack,
      ...data,
      timestamp: Date.now()
    }));
  }
};

// Usage in GameRoom
logger.game(this.roomId, 'round_start', { round: this.state.round });
logger.connection(this.roomId, client.sessionId, 'player_joined', { role: options.role });
logger.error('ai_generation', error, { roomId: this.roomId, round: this.state.round });
```

**Cloud Run Log Queries:**
```
# View all events for specific room
jsonPayload.roomId="K7M2P9"

# View all connection issues
jsonPayload.type="connection" AND jsonPayload.event="disconnected"

# View all errors in last hour
jsonPayload.level="error" AND timestamp > "2024-12-01T10:00:00Z"
```

---

