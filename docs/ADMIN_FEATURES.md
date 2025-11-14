# Admin Features: Prompt Management + Session Replay

**Goal:** Admin controls prompts + can replay any session to debug/analyze

**User-facing:** Players get retrospective view of their game (limited details)

---

## Architecture

```
┌─────────────────────────────────────────────┐
│ Admin Panel (/admin)                        │
│                                             │
│ 1. Prompt Management                        │
│    - Create new prompt variants             │
│    - Version controlled (immutable)         │
│    - See which sessions used which prompt   │
│                                             │
│ 2. Session Replay (All Sessions)            │
│    - See any game session                   │
│    - Full detail (hidden scores, AI logic)  │
│    - Debug why AI did X                     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ User Retrospective (/retrospective/:id)     │
│                                             │
│ - Replay their own session                  │
│ - Limited detail (no hidden scores)         │
│ - See action tree, consequences, outcomes   │
│ - Share link with others                    │
└─────────────────────────────────────────────┘
```

---

## Feature 1: Prompt Management

### Database Schema

```prisma
// prisma/schema.prisma

model PromptVariant {
  id          String   @id @default(cuid())
  category    String   // 'action_generation', 'consequences', 'ai_player'
  version     Int      // Auto-increment per category
  name        String   // 'v1-baseline', 'v2-moral-dilemmas', etc.

  // Prompt content
  systemPrompt String  @db.Text
  temperature  Float   @default(0.7)
  maxTokens    Int     @default(1000)

  // Metadata
  createdAt   DateTime @default(now())
  createdBy   String   // Admin user ID
  notes       String?  @db.Text // Why this variant was created

  // Usage tracking
  sessions    GameSession[] @relation("PromptUsage")

  // Immutable (no updates/deletes)
  @@unique([category, version])
  @@index([category, createdAt])
}

model GameSession {
  id          String   @id @default(cuid())

  // Game data
  roomId      String   @unique
  hostUserId  String
  startedAt   DateTime @default(now())
  endedAt     DateTime?

  // Prompt versions used (immutable record)
  actionPromptId      String
  actionPrompt        PromptVariant @relation("PromptUsage", fields: [actionPromptId], references: [id])
  consequencePromptId String?
  aiPlayerPromptId    String?

  // Session replay data
  events      SessionEvent[]

  // Final state
  finalState  Json?
  publicScore Int?

  @@index([hostUserId, startedAt])
}

model SessionEvent {
  id          String      @id @default(cuid())
  sessionId   String
  session     GameSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  // Event data
  round       Int
  timestamp   DateTime    @default(now())
  eventType   String      // 'action_submitted', 'round_advanced', 'ai_response', etc.
  actorId     String      // Who did this (player ID or 'system')

  // Event payload (full context)
  data        Json        // { action, options, consequences, state_before, state_after, etc. }

  @@index([sessionId, round])
}
```

### Admin Endpoints

```typescript
// app/admin/api/prompts/route.ts

/**
 * GET /admin/api/prompts?category=action_generation
 * List all prompt variants
 */
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category');

  const prompts = await prisma.promptVariant.findMany({
    where: category ? { category } : undefined,
    orderBy: [
      { category: 'asc' },
      { version: 'desc' },
    ],
    include: {
      _count: {
        select: { sessions: true }, // How many sessions used this
      },
    },
  });

  return NextResponse.json(prompts);
}

/**
 * POST /admin/api/prompts
 * Create new prompt variant (immutable, append-only)
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Validate admin auth
  const adminUserId = await verifyAdminAuth(req);
  if (!adminUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get next version number
  const lastVariant = await prisma.promptVariant.findFirst({
    where: { category: body.category },
    orderBy: { version: 'desc' },
  });

  const nextVersion = (lastVariant?.version || 0) + 1;

  // Create immutable variant
  const variant = await prisma.promptVariant.create({
    data: {
      category: body.category,
      version: nextVersion,
      name: body.name || `v${nextVersion}`,
      systemPrompt: body.systemPrompt,
      temperature: body.temperature || 0.7,
      maxTokens: body.maxTokens || 1000,
      createdBy: adminUserId,
      notes: body.notes,
    },
  });

  return NextResponse.json(variant);
}

// NO PUT/DELETE endpoints - prompts are immutable!
```

### Admin UI

```typescript
// app/admin/prompts/page.tsx

'use client';

import { useState } from 'react';

export default function AdminPromptsPage() {
  const [category, setCategory] = useState('action_generation');
  const [prompts, setPrompts] = useState([]);

  return (
    <div className="p-8">
      <h1>Prompt Management</h1>

      {/* Category selector */}
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="action_generation">Action Generation</option>
        <option value="consequences">Consequences</option>
        <option value="ai_player">AI Player</option>
      </select>

      {/* Prompt list */}
      <div className="mt-8">
        <h2>Existing Variants</h2>
        {prompts.map((prompt) => (
          <div key={prompt.id} className="border p-4 mb-4">
            <div className="flex justify-between">
              <div>
                <strong>{prompt.name}</strong> (v{prompt.version})
                <div className="text-sm text-gray-500">
                  Created {new Date(prompt.createdAt).toLocaleDateString()}
                  by {prompt.createdBy}
                </div>
                <div className="text-sm text-gray-500">
                  Used in {prompt._count.sessions} sessions
                </div>
              </div>
              <button
                onClick={() => setActivePrompt(prompt.id)}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Set Active
              </button>
            </div>

            {/* Expandable prompt preview */}
            <details className="mt-2">
              <summary>View Prompt</summary>
              <pre className="mt-2 bg-gray-100 p-4 rounded">
                {prompt.systemPrompt}
              </pre>
              <div className="mt-2 text-sm">
                Temperature: {prompt.temperature} | Max Tokens: {prompt.maxTokens}
              </div>
            </details>

            {prompt.notes && (
              <div className="mt-2 text-sm italic">
                Notes: {prompt.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create new variant */}
      <div className="mt-8 border p-4">
        <h2>Create New Variant</h2>
        <form onSubmit={handleCreateVariant}>
          <div className="mb-4">
            <label>Name</label>
            <input
              type="text"
              placeholder="e.g., v2-moral-dilemmas"
              className="w-full border p-2"
            />
          </div>

          <div className="mb-4">
            <label>System Prompt</label>
            <textarea
              rows={10}
              className="w-full border p-2 font-mono"
              placeholder="You are a Game Master..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label>Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                defaultValue="0.7"
                className="w-full border p-2"
              />
            </div>
            <div>
              <label>Max Tokens</label>
              <input
                type="number"
                defaultValue="1000"
                className="w-full border p-2"
              />
            </div>
          </div>

          <div className="mb-4">
            <label>Notes (why this variant?)</label>
            <textarea
              rows={3}
              className="w-full border p-2"
              placeholder="Trying to increase moral dilemmas..."
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-green-500 text-white rounded"
          >
            Create Variant (Immutable)
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## Feature 2: Session Replay

### Capture Events in GameRoom

```typescript
// game-server/rooms/GameRoom.ts

export class GameRoom extends Room<GameState> {
  private sessionId: string = '';

  async onCreate(options: any) {
    // Create session record
    this.sessionId = await prisma.gameSession.create({
      data: {
        roomId: this.roomId,
        hostUserId: options.userId,
        actionPromptId: getCurrentPromptId('action_generation'),
        // ... other prompt IDs
      },
    });

    this.logEvent('session_started', 'system', {
      setup: options.setup,
      players: options.players,
    });
  }

  async handleActionSubmitted(client: Client, action: any) {
    // Log the event
    await this.logEvent('action_submitted', client.sessionId, {
      action,
      options: this.getAvailableOptions(client.sessionId),
      state_before: this.state.toJSON(),
    });

    // ... rest of logic
  }

  async handleAdvanceRound(client: Client, message: any) {
    const state_before = this.state.toJSON();

    // ... run round logic ...

    const state_after = this.state.toJSON();

    // Log the round
    await this.logEvent('round_advanced', 'system', {
      round: this.state.round,
      state_before,
      state_after,
      ai_responses: aiResponses,
      consequences,
      score_changes,
    });
  }

  private async logEvent(
    eventType: string,
    actorId: string,
    data: any
  ) {
    await prisma.sessionEvent.create({
      data: {
        sessionId: this.sessionId,
        round: this.state.round,
        eventType,
        actorId,
        data: data as any, // Prisma Json type
      },
    });
  }

  async onDispose() {
    // Save final state
    await prisma.gameSession.update({
      where: { id: this.sessionId },
      data: {
        endedAt: new Date(),
        finalState: this.state.toJSON(),
        publicScore: this.state.coreMetricValue,
      },
    });
  }
}
```

### Admin Replay UI

```typescript
// app/admin/sessions/[id]/page.tsx

'use client';

export default function AdminSessionReplayPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);

  // Load session data
  useEffect(() => {
    fetch(`/admin/api/sessions/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setSession(data.session);
        setEvents(data.events);
      });
  }, [params.id]);

  // Filter events for current round
  const roundEvents = events.filter(e => e.round === currentRound);

  return (
    <div className="p-8">
      <h1>Session Replay: {session?.roomId}</h1>

      {/* Session metadata */}
      <div className="bg-gray-100 p-4 rounded mb-8">
        <div>Started: {new Date(session?.startedAt).toLocaleString()}</div>
        <div>Host: {session?.hostUserId}</div>
        <div>Final Score: {session?.publicScore}</div>
        <div>
          Prompts used:
          <ul className="ml-4">
            <li>Actions: {session?.actionPrompt?.name}</li>
            <li>Consequences: {session?.consequencePrompt?.name}</li>
          </ul>
        </div>
      </div>

      {/* Round selector */}
      <div className="mb-4">
        <label>Round:</label>
        {[...Array(session?.events.length / 10 || 5)].map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentRound(i)}
            className={`px-4 py-2 mx-1 ${currentRound === i ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {i}
          </button>
        ))}
      </div>

      {/* Event timeline */}
      <div className="space-y-4">
        {roundEvents.map((event) => (
          <div key={event.id} className="border p-4 rounded">
            <div className="flex justify-between">
              <div>
                <strong>{event.eventType}</strong>
                <span className="ml-4 text-sm text-gray-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <span className="text-sm">Actor: {event.actorId}</span>
            </div>

            {/* Event details (expandable) */}
            <details className="mt-2">
              <summary>View Details</summary>
              <pre className="mt-2 bg-gray-100 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </details>

            {/* Admin-only: AI reasoning */}
            {event.eventType === 'ai_response' && (
              <div className="mt-2 bg-yellow-50 p-2 rounded">
                <strong>AI Reasoning (Admin Only):</strong>
                <div>{event.data.reasoning}</div>
                <div className="text-sm mt-1">
                  Hidden score before: {event.data.hidden_score_before}
                  → after: {event.data.hidden_score_after}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* State snapshot */}
      <div className="mt-8 border p-4">
        <h2>State at Round {currentRound}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3>Public State</h3>
            <div>Public Score: {getStateAtRound(currentRound)?.publicScore}</div>
            <div>Event Log: ...</div>
          </div>
          <div>
            <h3>Hidden State (Admin Only)</h3>
            <div>Hidden Scores: {JSON.stringify(getStateAtRound(currentRound)?.hiddenScores)}</div>
            <div>AI Objectives: ...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### User Retrospective UI

```typescript
// app/retrospective/[id]/page.tsx

'use client';

export default function UserRetrospectivePage({ params }: { params: { id: string } }) {
  // Similar to admin replay, but:
  // 1. Only shows user's own sessions (check userId)
  // 2. Hides hidden scores/AI reasoning
  // 3. Shows action tree visualization
  // 4. Shareable link (public read-only)

  return (
    <div className="p-8">
      <h1>Game Retrospective</h1>

      {/* Public timeline (no hidden info) */}
      <div className="mt-8">
        <h2>Round {currentRound}</h2>

        {/* Show what happened */}
        <div className="mb-4">
          <h3>Actions Taken</h3>
          {roundActions.map(action => (
            <div key={action.id} className="border p-2">
              <strong>{action.role}:</strong> {action.title}
            </div>
          ))}
        </div>

        {/* Show consequences */}
        <div className="mb-4">
          <h3>What Happened</h3>
          <div>{consequences.summary}</div>
          <div className="mt-2">
            Score change: {consequences.scoreChange}
          </div>
        </div>

        {/* Action tree visualization */}
        <div className="mt-8">
          <ActionTreeVisualization events={roundEvents} />
        </div>
      </div>

      {/* Share link */}
      <div className="mt-8">
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied! Share with your team.');
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Share Retrospective
        </button>
      </div>
    </div>
  );
}
```

---

## Why This Approach

### Prompt Management

**✅ Version controlled** (every prompt has version number, immutable)
**✅ Audit trail** (who created, when, why)
**✅ Usage tracking** (which sessions used which prompt)
**✅ Easy comparison** (see prompt A vs B side-by-side)
**✅ Rollback friendly** (just set old version as active)

**vs Env Vars:**
- ❌ Env vars can't store full prompts (size limits, formatting)
- ❌ No version history
- ❌ No usage tracking

**vs PostHog:**
- ✅ No external dependency
- ✅ Version controlled in DB (not SaaS dashboard)
- ❌ Requires redeploy to activate (vs PostHog instant)

### Session Replay

**✅ Full audit trail** (every action, state change logged)
**✅ Debug AI behavior** (see why AI chose X)
**✅ Reproduce bugs** (exact state at any round)
**✅ User-facing retrospective** (players review their game)
**✅ Shareable** (send link to teammates)

**vs Sentry Session Replay:**
- ✅ Game-specific (not just clicks/errors)
- ✅ Shows game logic (actions, consequences, scores)
- ✅ Cheaper (store in your DB, not SaaS)
- ❌ No video replay (Sentry has screen recording)

---

## Implementation Plan

### Phase 1: Prompt Management (2-3 days)

1. Add Prisma schema for `PromptVariant`
2. Create admin API endpoints (GET, POST)
3. Build admin UI for creating/viewing prompts
4. Update AI service to fetch active prompt from DB

### Phase 2: Session Replay (3-4 days)

1. Add Prisma schema for `GameSession`, `SessionEvent`
2. Update GameRoom to log all events
3. Create admin replay UI
4. Create user retrospective UI

### Phase 3: Integration (1 day)

1. Link prompts to sessions (track which prompt was used)
2. Show prompt variant in replay UI
3. Compare sessions using different prompts

---

## Next Steps

Want me to:
1. **Implement Prisma schema** (models for prompts + sessions)
2. **Build admin API endpoints** (prompt management + session replay)
3. **Create admin UI** (React components for management)
4. **Update GameRoom** (log events for replay)

Which should I start with?
