## Risk Mitigation Strategies

### Risk 1: Timeline Overrun (Medium Likelihood, High Impact)

**Failure Mode:**
- Complex bugs take longer than expected
- Reach Day 15, still not confident
- Event in 5 days, Colyseus not ready

**Mitigation:**
- **Timeboxing:** Each phase has hard deadline. If overrunning, escalate decision.
- **Circuit Breakers:**
  - End of Day 6: If core game not working, extend 2 days OR pause scope-creep features
  - End of Day 13: If production errors >5%, halt rollout and swarm reliability
  - Day 18 (T-3 days): Go/No-Go decision. If not confident, limit tables or delay rather than re-open SSE.
- **Single Protocol:** SSE is frozen; operational kill-switch pauses room creation if instability resurfaces.

**Backup Plan:**
- If Colyseus stability is insufficient, cap concurrent rooms and lengthen breaks between sessions
- Have tech support on-site for quick troubleshooting and admin interventions
- If still risky, delay event schedule instead of splitting focus with SSE

**Decision Framework:**
- Day 18: If <90% confident in Colyseus → narrow scope (fewer rooms, longer buffers) or reschedule; keep WebSocket-only
- Better to reduce volume than to carry dual protocols that dilute testing

---

### Risk 2: Colyseus Doesn't Feel Better (Low Likelihood, Medium Impact)

**Failure Mode:**
- Day 5: "This is still confusing, just different confusing"
- Debugging Colyseus schema bugs instead of SSE reconnection
- Realize we traded one set of problems for another

**Mitigation:**
- **Day 2 Checkpoint:** Explicit validation "Does this feel clearer?"
- **No Dual Stack:** Avoid the cognitive overhead of maintaining SSE as an escape hatch; swarm on fixes instead
- **Learning Resources:** Colyseus docs + community for questions

**If This Happens:**
- Be honest with ourselves
- Re-focus scope (fewer admin features, simpler AI) and fix specific pain points in Colyseus
- If blocked, consider delaying the event rather than reintroducing SSE

---

### Risk 3: AI Agent Complexity (Low Likelihood, Medium Impact) - MITIGATED BY ARCHITECTURE

**Original Concern (If Using Python Matrix):**
- Complex inter-service communication (WebSocket/HTTP bridge)
- Schema coupling between TypeScript and Python
- Debugging across language boundaries
- State synchronization issues

**How MVP Architecture Mitigates This:**
- ✅ **Single Language:** Everything in TypeScript (one mental model)
- ✅ **In-Process Agents:** Direct function calls (no network layer)
- ✅ **OpenAI Agents SDK:** Production-ready, well-maintained library
- ✅ **LiteLLM Proxy:** Already proven infrastructure (100+ playthroughs)

**Remaining Risks:**
- Agent SDK might have bugs (low likelihood - official OpenAI library)
- LiteLLM proxy downtime (mitigate: fallback to direct OpenAI)
- Agent memory issues (mitigate: test thoroughly in Phase 2)

**Mitigation:**
- **Day 5-6:** Extensive agent testing (memory persistence, tool calling)
- **Fallback:** If Agent SDK fails, revert to direct OpenAI chat completions (simpler)
- **MCP Future Path:** Can add Python tools post-event if needed (not blocking MVP)

**Decision Framework:**
- If Agent SDK working by Day 6 → proceed
- If blocking issues → fallback to direct chat completion API
- Post-event: revisit Python Matrix via MCP if simulation quality priority

---

### Risk 4: Production Surprises (Medium Likelihood, Medium Impact)

**Failure Modes:**
- Cloud Run WebSocket behaves differently in production vs local
- Auth cookies don't work cross-domain
- Network latency causes issues
- Cold starts kill active games

**Mitigation:**
- **Early Production Deploy:** Day 12 (staging), Day 13 (prod with tight room caps)
- **Gradual Rollout:** Increase room caps only when telemetry is green
- **Monitoring:** Structured logs, admin dashboard, error tracking
- **Kill-Switch:** Pause new room creation and drain existing rooms if production issues arise

**Specific Safeguards:**
- Set Cloud Run `min-instances=1` (prevent cold starts)
- Set timeout to 60 minutes (long enough for games)
- Test from multiple networks (WiFi, mobile, VPN)

---

### Risk 5: Multiplayer Edge Cases We Didn't Anticipate (Medium Likelihood, Low Impact)

**Failure Modes:**
- "What if player disconnects during AI turn?"
- "What if two players submit actions simultaneously?"
- "What if host rage-quits?"

**Mitigation:**
- **Phase 3 (Days 7-9):** Dedicated time for edge cases
- **Testing Matrix:** Document all scenarios, test each one
- **Graceful Degradation:** When in doubt, keep game playable
  - Unknown edge case → log error, show message, continue game
  - Don't crash the room

**Example Decision Framework:**
- Player disconnects → allow 60s reconnection
- Timeout → AI takes over, game continues
- Goal: Never let one player's issue crash the game for everyone

---

### Risk 6: IRL Event Technical Issues (Low Likelihood, High Impact)

**Failure Modes:**
- Venue WiFi is terrible
- Connection drops during high-visibility demo
- Bug appears only in production during event

**Mitigation:**
- **Dry Run (Day 20):** Full rehearsal with 18-24 people
- **On-Site Tech Support:** Designated person with admin access
- **Rollback Plan:** Pause new rooms and drain gracefully if major issues; prioritize fewer concurrent tables over protocol swap
- **Fallback Activity:** If all tech fails, have paper-based backup exercise

**Decision Tree (Event Day):**
```
Issues affecting <10% of players → Tech support fixes, event continues
Issues affecting 10-50% of players → Pause, assess, lower room cap, decide in 5 min
Issues affecting >50% of players → Pause new rooms, consider delaying/condensing sessions, OR move to paper fallback
```

**Worst Case Acceptance:**
- If tech completely fails, we have non-digital backup
- Event success is about the experience, not the tech
- But we do everything possible to prevent this

---

## Success Criteria

### Week 1 (End of Day 5)
- [ ] ✅ Can 2 developers explain how Colyseus works?
- [ ] ✅ Did 10 test games complete without connection drops?
- [ ] ✅ Does debugging feel easier than SSE? (Subjective but honest)
- [ ] ✅ Is core game loop playable end-to-end?

**If any NO:** Extend timeline by 2 days OR pause migration

---

### Week 2 (End of Day 10)
- [ ] ✅ Multiplayer edge cases handled (disconnects, concurrent actions)
- [ ] ✅ Admin dashboard functional (can view/debug live games)
- [ ] ✅ No critical bugs in last 3 days
- [ ] ✅ Development velocity feels faster (adding features easier)

**If any NO:** Alert stakeholders, discuss contingency

---

### Week 3 (End of Day 15)
- [ ] ✅ Production deployment successful
- [ ] ✅ Load test passed (4 concurrent games, 2 hours, stable)
- [ ] ✅ Real users tested (12+ people, 4+/5 star rating)
- [ ] ✅ Error rate <1% for Colyseus users
- [ ] ✅ Kill-switch tested (can pause new rooms + drain safely in <5 min)

**Decision:** GO or NO-GO for using Colyseus at IRL event

---

### IRL Event (Day 21)
- [ ] ✅ All 3-4 games started successfully
- [ ] ✅ <10% connection issues (2-3 players max across all games)
- [ ] ✅ When issues occur, resolved in <5 min using admin dashboard
- [ ] ✅ Participants rate tech experience 4+/5 stars
- [ ] ✅ No "please refresh" moments during high-visibility demos

**Success Definition:** Event achieves goals without tech being a distraction

---

### Post-Event (Week 5+)
- [ ] ✅ Colyseus at 100% rollout for all users
- [ ] ✅ SSE code deleted (no longer needed)
- [ ] ✅ Connection error rate <1% sustained over 2 weeks
- [ ] ✅ Developer velocity: Adding features takes 50% less time
- [ ] ✅ User feedback: "Multiplayer works great"

---

## Observability & Monitoring Strategy

### Recommended Stack (Optimized for 4-Week Timeline)

**Phase 1 (Weeks 1-3): Minimal & Effective**

1. **Sentry** - Error tracking & performance monitoring
2. **Operational Toggles** - Room caps + kill-switch via env vars
3. **Cloud Run Logs** - Structured logging (JSON)

**Phase 2 (Post-Event): Enhanced Analytics**

4. **PostHog** - Product analytics, session replay, user behavior

### Sentry Setup (Day 1 - 30 minutes)

**Why Sentry:**
- Free tier: 5,000 errors/month (sufficient for MVP)
- Source map support (see exact TypeScript line that failed)
- Performance monitoring (identify slow AI calls)
- Cloud Run integration (automatic deployment tracking)
- Future-proof: Distributed tracing when Matrix added

**Installation:**

```bash
npm install @sentry/nextjs @sentry/node
npx @sentry/wizard -i nextjs
```

**Configuration:**

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions (cost control)

  // Error filtering (ignore noisy errors)
  ignoreErrors: [
    'ResizeObserver loop limit exceeded', // Browser noise
    'Non-Error promise rejection', // Not actionable
  ],

  // Tag all events with deployment info
  initialScope: {
    tags: {
      service: 'stein',
      version: process.env.VERCEL_GIT_COMMIT_SHA,
    },
  },
});
```

**GameRoom Integration:**

```typescript
// game-server/rooms/GameRoom.ts
import * as Sentry from '@sentry/node';

export class GameRoom extends Room<GameState> {

  onCreate(options: any) {
    // Start Sentry transaction for game session
    const transaction = Sentry.startTransaction({
      op: 'game.session',
      name: 'GameRoom Lifecycle',
      tags: {
        roomCode: this.metadata.code,
        playerCount: options.playerCount,
      },
    });

    Sentry.getCurrentHub().configureScope(scope => {
      scope.setSpan(transaction);
      scope.setTag('roomId', this.roomId);
    });
  }

  async handleAction(client: Client, action: any) {
    const span = Sentry.getCurrentHub().getScope()?.getSpan();
    const childSpan = span?.startChild({
      op: 'game.action',
      description: `Process action: ${action.type}`,
    });

    try {
      // Your game logic here
      await this.processAction(client, action);
      childSpan?.setStatus('ok');
    } catch (error) {
      // Capture error with rich context
      Sentry.captureException(error, {
        tags: {
          roomId: this.roomId,
          actionType: action.type,
          round: this.state.round,
        },
        contexts: {
          game: {
            phase: this.state.phase,
            playerCount: this.state.players.size,
            publicScore: this.state.publicScore,
          },
        },
      });
      childSpan?.setStatus('internal_error');
      throw error;
    } finally {
      childSpan?.finish();
    }
  }

  async callAI(prompt: string) {
    // Track AI call performance
    return await Sentry.startSpan(
      {
        op: 'ai.generation',
        name: 'LLM API Call',
      },
      async () => {
        const response = await geminiService.generate(prompt);
        return response;
      }
    );
  }
}
```

**What You Get:**
- Automatic error alerts (Slack, email)
- Performance waterfall: "User action → Game logic → AI call → Response"
- Error rate dashboard: "5 errors in last hour, all from same room"
- Breadcrumbs: "What happened before the crash?"

**Cost:** Free (up to 5k errors/month)

---

### Operational Toggles (Environment Variables)

Use lightweight env vars instead of full feature-flag stacks to manage operational levers for the rollout (caps and pausing new rooms) while staying WebSocket-only.

**Operational Toggles (Room Caps + Kill Switch):**

```typescript
// services/config.ts
export const ROOM_CAP = parseInt(process.env.ROOM_CAP ?? '4', 10);
export const ACCEPT_NEW_ROOMS = process.env.ACCEPT_NEW_ROOMS !== 'false';

// server/routes/createRoom.ts
if (!ACCEPT_NEW_ROOMS) {
  return res.status(503).json({ error: 'Room creation paused' });
}

if (activeRoomCount >= ROOM_CAP) {
  return res.status(429).json({ error: 'Room cap reached; try again soon' });
}

// proceed to create room
```

**Ramp Process:**

- Day 13: `ROOM_CAP=2`, `ACCEPT_NEW_ROOMS=true` (facilitator smoke test)
- Day 14-15: Increase `ROOM_CAP` to 4 (event target) once telemetry is green
- Emergency: Set `ACCEPT_NEW_ROOMS=false` to drain; lower `ROOM_CAP` after fix

**Post-Event: Migrate to PostHog (Optional)**

When you want advanced features:
- A/B testing (e.g., test 2 different AI prompt styles)
- Session replay (watch user journey when bug reported)
- Product analytics (which features are used most?)

**Setup (Week 5+):**

```typescript
// lib/posthog.ts
import posthog from 'posthog-js';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: 'https://app.posthog.com',
  loaded: (posthog) => {
    if (process.env.NODE_ENV === 'development') posthog.opt_out_capturing();
  },
});

// Track game events
posthog.capture('game_started', {
  roomCode: room.id,
  playerRole: userRole,
  gameType: 'ai_safety',
});

// Feature flags (replaces env vars)
const useNewPromptStyle = posthog.isFeatureEnabled('new-prompt-style');
```

**Cost:** Free tier: 1M events/month

---

### Distributed Tracing (When Matrix Added - Milestone 2)

**Scenario:** User reports "Round took 10 seconds, felt slow"

**Without distributed tracing:**
- Check Stein logs: "AI call took 5s"
- Check Matrix logs: "LLM call took 4s"
- Manual correlation: 😓 Which Stein request → which Matrix request?

**With distributed tracing (Sentry):**
```
Trace ID: abc-123-def
├─ Stein: handleAction (50ms)
│  ├─ Validate action (5ms)
│  └─ Call Matrix API (4850ms) ← Bottleneck!
│     └─ Matrix: /intelligence/respond
│        ├─ Generate prompt (20ms)
│        └─ LLM API call (4800ms) ← Real bottleneck!
│           └─ OpenAI: chat/completions
└─ Stein: Broadcast state (30ms)

Total: 4930ms
```

**Setup (Milestone 2):**

```typescript
// Stein calls Matrix with trace context
const transaction = Sentry.getCurrentHub().getScope()?.getSpan();

const response = await fetch('http://matrix:8000/intelligence/respond', {
  headers: {
    'sentry-trace': transaction?.toTraceparent(),
    'baggage': transaction?.toBaggage(),
  },
  body: JSON.stringify(gameContext),
});
```

```python
# Matrix receives and continues trace
import sentry_sdk

@app.post("/intelligence/respond")
async def respond(request: Request):
    # Sentry automatically extracts trace headers
    with sentry_sdk.start_transaction(
        op="ai.response",
        name="Generate AI Response",
    ) as transaction:
        with sentry_sdk.start_span(op="llm.call") as span:
            response = await call_llm(context)
            span.set_tag("model", "gemini-2.5-flash")
            span.set_data("prompt_tokens", response.usage.prompt_tokens)
        return response
```

**What You Get:**
- Single trace across Stein → Matrix → LLM
- Identify bottlenecks instantly
- "95% of time spent in LLM call" → optimize prompts, not code

**Cost:** Included in Sentry Performance Monitoring

---

### Structured Logging (Cloud Run)

**Why structured logs:**
- Searchable: `jsonPayload.roomId="K7M2P9"`
- Aggregatable: "Show all disconnection events in last hour"
- Exportable: Send to BigQuery for analysis

**Implementation:**

```typescript
// lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  roomId?: string;
  sessionId?: string;
  round?: number;
  phase?: string;
  [key: string]: any;
}

export const logger = {
  log(level: LogLevel, message: string, context?: LogContext) {
    const entry = {
      severity: level.toUpperCase(),
      message,
      timestamp: new Date().toISOString(),
      service: 'stein',
      ...context,
    };

    console.log(JSON.stringify(entry));
  },

  debug: (msg: string, ctx?: LogContext) => logger.log('debug', msg, ctx),
  info: (msg: string, ctx?: LogContext) => logger.log('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext) => logger.log('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext) => logger.log('error', msg, ctx),
};

// Usage in GameRoom
logger.info('Round started', {
  roomId: this.roomId,
  round: this.state.round,
  playerCount: this.state.players.size,
});

logger.error('AI call failed', {
  roomId: this.roomId,
  error: error.message,
  prompt_length: prompt.length,
});
```

**Cloud Run Queries:**

```
# All events for specific room
jsonPayload.roomId="K7M2P9"

# All errors in last hour
severity="ERROR" AND timestamp>="2024-12-01T10:00:00Z"

# All disconnections
jsonPayload.message="Player disconnected"

# Slow AI calls (if you log duration)
jsonPayload.ai_duration > 5000
```

**Export to BigQuery (Optional, Post-Event):**
```bash
# Create log sink (one-time)
gcloud logging sinks create game-logs \
  bigquery.googleapis.com/projects/your-project/datasets/game_logs \
  --log-filter='resource.type="cloud_run_revision" AND jsonPayload.service="stein"'

# Now query in BigQuery
SELECT
  jsonPayload.roomId,
  COUNT(*) as error_count
FROM `game_logs.cloudrun_logs`
WHERE severity = 'ERROR'
GROUP BY jsonPayload.roomId
ORDER BY error_count DESC
LIMIT 10
```

---

### Monitoring Dashboard (Day 11 - Part of Admin Dashboard)

**Built-in Metrics View:**

```typescript
// pages/admin/metrics.tsx
export default function MetricsPage() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // Fetch from Sentry API or Cloud Run API
    fetch('/api/admin/metrics').then(r => r.json()).then(setMetrics);
  }, []);

  return (
    <div>
      <h1>System Health</h1>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          title="Active Games"
          value={metrics?.activeRooms}
          trend="+3 from 1hr ago"
        />

        <MetricCard
          title="Error Rate"
          value={`${metrics?.errorRate}%`}
          status={metrics?.errorRate < 1 ? 'good' : 'warning'}
        />

        <MetricCard
          title="Avg AI Latency"
          value={`${metrics?.avgAiLatency}ms`}
          status={metrics?.avgAiLatency < 3000 ? 'good' : 'warning'}
        />
      </div>

      <div className="mt-8">
        <h2>Recent Errors (from Sentry)</h2>
        <ErrorList errors={metrics?.recentErrors} />
      </div>

      <div className="mt-8">
        <h2>Performance (Last 24h)</h2>
        <PerformanceChart data={metrics?.performanceTimeseries} />
      </div>
    </div>
  );
}
```

---

### Summary: Observability Evolution

**Week 1 (Minimal - 1 hour setup):**
- ✅ Sentry for errors
- ✅ Env vars for feature flags
- ✅ Structured Cloud Run logs

**Week 3 (Pre-Event - existing tools):**
- ✅ Sentry dashboard for error monitoring
- ✅ Admin dashboard for live game monitoring
- ✅ Cloud Run logs for debugging

**Week 5+ (Enhanced - optional):**
- ✅ PostHog for product analytics
- ✅ Session replay for user research
- ✅ Advanced feature flags (A/B tests)

**Milestone 2 (Matrix Added):**
- ✅ Distributed tracing (Stein ↔ Matrix)
- ✅ Cross-service performance monitoring
- ✅ Unified error tracking

**Cost Breakdown:**
- Sentry: Free (5k errors/month)
- PostHog: Free (1M events/month)
- Cloud Run Logs: Free (50GB/month)
- **Total: $0/month for MVP**

---

## Admin Dashboard: Detailed Specifications

### Purpose

The admin dashboard is **critical for IRL event success**. When 18-24 people are playing and something breaks, you need to diagnose and fix in <5 minutes. This dashboard makes that possible.

### Design Principles

1. **Mobile-First:** Debuggable from phone (you'll be walking around venue)
2. **Real-Time:** Updates without refresh (WebSocket or 5s polling)
3. **Actionable:** Every piece of info has a "what do I do?" action
4. **Zero-Click Triage:** See problem at a glance, drill down for details

### Security

**Authentication:**
```typescript
// middleware.ts (Next.js 13+)
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const authHeader = request.headers.get('authorization');
    const expectedToken = `Bearer ${process.env.ADMIN_SECRET}`;

    if (authHeader !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
}
```

**Login Page:**
```typescript
// pages/admin/index.tsx
export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = () => {
    // Store in localStorage (simple, not production-grade but fine for admin)
    localStorage.setItem('adminToken', password);
    router.push('/admin/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-4">Admin Access</h1>
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="w-full px-4 py-2 rounded bg-gray-700 text-white"
        />
        <button
          onClick={handleLogin}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Login
        </button>
      </div>
    </div>
  );
}
```

---

### Page 1: Dashboard Overview

**URL:** `/admin/dashboard`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Simulacra Admin • IRL Event Mode                    ⚙️ │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  System Health                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Active   │  │ Error    │  │ Avg      │             │
│  │ Games    │  │ Rate     │  │ Latency  │             │
│  │    3     │  │  0.2%    │  │  1.2s    │             │
│  │  ✅      │  │  ✅      │  │  ✅      │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                         │
│  Active Games                        🔄 Auto-refresh   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Room: ABC123 • Round 3 • Action • 6/6 players  │   │
│  │ ✅✅✅✅✅⚠️  Last activity: 15s ago         │   │
│  │ [View Details] [Force Advance] [End Game]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Room: XYZ789 • Round 2 • Consequence • 6/6     │   │
│  │ ✅✅✅✅✅✅  Last activity: 2s ago          │   │
│  │ [View Details] [Force Advance] [End Game]      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Room: QWE456 • Round 1 • Action • 5/6 players  │   │
│  │ ✅✅✅✅✅❌  Waiting for Player 6...        │   │
│  │ [View Details] [Kick Player 6] [Start Anyway]  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Recent Issues (Last 30 min)                           │
│  ⚠️ 3 disconnections in room ABC123                    │
│  ⚠️ Slow AI response in XYZ789 (4.2s)                  │
│  ✅ No critical errors                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Component Implementation:**

```typescript
// pages/admin/dashboard.tsx
import { useEffect, useState } from 'react';
import { matchMaker } from 'colyseus.js';

interface RoomInfo {
  roomId: string;
  code: string;
  round: number;
  phase: string;
  players: PlayerStatus[];
  lastActivity: Date;
}

interface PlayerStatus {
  sessionId: string;
  role: string;
  connected: boolean;
  hasSubmitted: boolean;
}

export default function AdminDashboard() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [metrics, setMetrics] = useState({
    activeGames: 0,
    errorRate: 0,
    avgLatency: 0,
  });

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/colyseus-admin/rooms', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      const data = await res.json();
      setRooms(data.rooms);
      setMetrics(data.metrics);
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const forceAdvanceRound = async (roomId: string) => {
    if (!confirm('Force advance this round? Players may lose progress.')) return;

    await fetch(`/colyseus-admin/rooms/${roomId}/force-advance`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
      },
    });
  };

  const endGame = async (roomId: string) => {
    if (!confirm('End this game? This cannot be undone.')) return;

    await fetch(`/colyseus-admin/rooms/${roomId}/end`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Simulacra Admin</h1>
          <span className="px-3 py-1 bg-red-600 rounded text-sm">
            IRL Event Mode
          </span>
        </header>

        {/* Health Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <MetricCard
            title="Active Games"
            value={metrics.activeGames}
            status={metrics.activeGames > 0 ? 'good' : 'neutral'}
          />
          <MetricCard
            title="Error Rate"
            value={`${metrics.errorRate}%`}
            status={metrics.errorRate < 1 ? 'good' : 'warning'}
          />
          <MetricCard
            title="Avg Latency"
            value={`${metrics.avgLatency}s`}
            status={metrics.avgLatency < 2 ? 'good' : 'warning'}
          />
        </div>

        {/* Active Games */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center">
            Active Games
            <span className="ml-2 text-sm text-gray-400">
              Auto-refresh every 5s
            </span>
          </h2>

          {rooms.length === 0 && (
            <p className="text-gray-400">No active games</p>
          )}

          {rooms.map((room) => (
            <RoomCard
              key={room.roomId}
              room={room}
              onForceAdvance={() => forceAdvanceRound(room.roomId)}
              onEndGame={() => endGame(room.roomId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, status }: {
  title: string;
  value: string | number;
  status: 'good' | 'warning' | 'error' | 'neutral';
}) {
  const colors = {
    good: 'bg-green-900 border-green-600',
    warning: 'bg-yellow-900 border-yellow-600',
    error: 'bg-red-900 border-red-600',
    neutral: 'bg-gray-800 border-gray-600',
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${colors[status]}`}>
      <div className="text-sm text-gray-400">{title}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

function RoomCard({ room, onForceAdvance, onEndGame }: {
  room: RoomInfo;
  onForceAdvance: () => void;
  onEndGame: () => void;
}) {
  const connectedCount = room.players.filter(p => p.connected).length;
  const totalCount = room.players.length;

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold">
            Room: {room.code}
          </h3>
          <p className="text-sm text-gray-400">
            Round {room.round} • {room.phase} • {connectedCount}/{totalCount} players
          </p>
        </div>
        <span className="text-xs text-gray-500">
          {formatTimeSince(room.lastActivity)} ago
        </span>
      </div>

      {/* Player Status Icons */}
      <div className="flex gap-2 mb-3">
        {room.players.map((player) => (
          <PlayerStatusIcon
            key={player.sessionId}
            player={player}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/colyseus-admin/rooms/${room.roomId}`}
          className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
        >
          View Details
        </Link>
        <button
          onClick={onForceAdvance}
          className="px-3 py-1 bg-yellow-600 rounded text-sm hover:bg-yellow-700"
        >
          Force Advance
        </button>
        <button
          onClick={onEndGame}
          className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
        >
          End Game
        </button>
      </div>
    </div>
  );
}

function PlayerStatusIcon({ player }: { player: PlayerStatus }) {
  if (player.connected && player.hasSubmitted) {
    return <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center" title={`${player.role} - Ready`}>✓</div>;
  }
  if (player.connected) {
    return <div className="w-8 h-8 bg-yellow-600 rounded flex items-center justify-center" title={`${player.role} - Thinking...`}>⏳</div>;
  }
  return <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center" title={`${player.role} - Disconnected`}>✗</div>;
}

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}
```

---

### Page 2: Room Details

**URL:** `/colyseus-admin/rooms/[roomId]`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Dashboard          Room: ABC123              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Game State                                             │
│  Room Code: ABC123                                      │
│  Round: 3 / 5                                           │
│  Phase: Action                                          │
│  Public Score: 58                                       │
│  Created: 15 minutes ago                                │
│                                                         │
│  Players (6/6)                          🔄 Live Updates │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ✅ Governor (Session: a1b2c3)                   │   │
│  │    Status: Connected • Submitted action         │   │
│  │    Last seen: 5s ago                            │   │
│  │    Hidden score: 12                             │   │
│  │    [Kick] [Send Message]                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚠️ Tech CEO (Session: d4e5f6)                   │   │
│  │    Status: Connected • Waiting for action       │   │
│  │    Last seen: 42s ago  ⚠️ Idle for 42s          │   │
│  │    Hidden score: 8                              │   │
│  │    [Kick] [Send Message] [Nudge]               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ❌ Journalist (Session: g7h8i9)                 │   │
│  │    Status: Disconnected (60s ago)               │   │
│  │    Reconnection window: 0s remaining            │   │
│  │    Hidden score: 15                             │   │
│  │    [Remove] [Replace with AI]                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [+ 3 more players...]                                 │
│                                                         │
│  Recent Actions (Last 10)                              │
│  14:32:15 - Governor submitted: "Investigate claims"   │
│  14:31:58 - Tech CEO submitted: "Issue statement"      │
│  14:31:42 - System: Round 3 started                    │
│  14:30:15 - AI: Consequence calculated (-5 trust)      │
│  14:29:48 - Journalist disconnected                    │
│                                                         │
│  Game Events Log (Last 50)        [Export Full JSON]   │
│  [Scrollable log with timestamps...]                   │
│                                                         │
│  Admin Actions                                         │
│  [Force Advance Round] [Pause Game] [End Game]         │
│  [Export State] [Replay from Round 2]                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**API Endpoint (Express route on the same server):**

```typescript
// server/routes/admin.ts
import { Router } from 'express';
import { matchMaker } from 'colyseus';

const router = Router();

const requireAdmin = (req, res, next) => {
  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.get('/rooms/:roomId', requireAdmin, async (req, res) => {
  try {
    const room = await matchMaker.getRoomById(req.params.roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const detailedState = room.state.toJSON();
    res.json({
      roomId: room.roomId,
      code: room.metadata?.code,
      state: detailedState,
      clients: room.clients.map((c) => ({ sessionId: c.sessionId })),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
```

**Admin Actions Implementation:**

```typescript
// game-server/rooms/GameRoom.ts
export class GameRoom extends Room<GameState> {

  // Allow admins to call special methods
  onMessage('admin:force_advance', (client, message) => {
    // Verify this is admin (check special admin session)
    if (!this.isAdmin(client)) {
      return;
    }

    logger.warn('Admin forced round advance', {
      roomId: this.roomId,
      adminSession: client.sessionId,
    });

    // Force advance round
    this.advanceRound();
  });

  onMessage('admin:kick_player', (client, message) => {
    if (!this.isAdmin(client)) return;

    const targetClient = this.clients.find(c => c.sessionId === message.sessionId);
    if (targetClient) {
      targetClient.leave(4000); // Kick with code 4000
      logger.warn('Admin kicked player', {
        roomId: this.roomId,
        kickedSession: message.sessionId,
      });
    }
  });

  onMessage('admin:pause_game', (client, message) => {
    if (!this.isAdmin(client)) return;

    this.state.paused = true;
    this.broadcast('system_message', 'Game paused by admin');

    logger.info('Admin paused game', { roomId: this.roomId });
  });

  private isAdmin(client: Client): boolean {
    // Simple check: admin connects with special metadata
    return client.auth?.isAdmin === true;
  }
}
```

---

### Page 3: Live Logs

**URL:** `/admin/logs`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Live Logs                                    🔴 LIVE    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Filters:                                               │
│  Room: [All ▼] Level: [All ▼] Search: [________]       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 14:35:22 INFO  [ABC123] Round 3 started         │   │
│  │ 14:35:18 DEBUG [ABC123] AI call started         │   │
│  │ 14:35:15 ERROR [XYZ789] Connection lost          │   │
│  │              sessionId: g7h8i9                   │   │
│  │              reason: Network timeout             │   │
│  │              [View Full Error]                   │   │
│  │ 14:35:10 INFO  [ABC123] Player action received  │   │
│  │              player: Governor                    │   │
│  │              action: Investigate claims          │   │
│  │ 14:35:05 WARN  [QWE456] Slow AI response        │   │
│  │              duration: 4200ms                    │   │
│  │              model: gemini-2.5-flash             │   │
│  │ ...                                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Pause Auto-scroll] [Export Last 1000] [Clear]        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Real-Time Implementation (Server-Sent Events):**

```typescript
// pages/api/admin/logs/stream.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Auth
  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Subscribe to log stream (using EventEmitter or similar)
  const logListener = (logEntry: any) => {
    res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  };

  globalLogEmitter.on('log', logListener);

  // Clean up on disconnect
  req.on('close', () => {
    globalLogEmitter.off('log', logListener);
  });
}

// In your logger
// lib/logger.ts
import { EventEmitter } from 'events';

export const globalLogEmitter = new EventEmitter();

export const logger = {
  log(level: LogLevel, message: string, context?: LogContext) {
    const entry = {
      timestamp: Date.now(),
      level,
      message,
      ...context,
    };

    console.log(JSON.stringify(entry));

    // Also emit for admin dashboard
    globalLogEmitter.emit('log', entry);
  },
  // ... rest of logger
};
```

---

### Mobile-Responsive Design

**Tailwind CSS Responsive Classes:**

```typescript
// Example: RoomCard component with mobile optimization
function RoomCard({ room }: { room: RoomInfo }) {
  return (
    <div className="
      bg-gray-800 p-4 rounded-lg border border-gray-700
      md:p-6 /* Larger padding on desktop */
    ">
      <div className="
        flex flex-col gap-2
        md:flex-row md:justify-between md:items-start /* Row layout on desktop */
      ">
        <div>
          <h3 className="text-base md:text-lg font-semibold">
            Room: {room.code}
          </h3>
          <p className="text-xs md:text-sm text-gray-400">
            Round {room.round} • {room.phase}
          </p>
        </div>
      </div>

      {/* Player status icons - scrollable on mobile */}
      <div className="
        flex gap-2 overflow-x-auto py-2
        md:overflow-x-visible /* No scroll on desktop */
      ">
        {room.players.map(p => <PlayerIcon key={p.id} player={p} />)}
      </div>

      {/* Action buttons - stack on mobile */}
      <div className="
        flex flex-col gap-2
        md:flex-row /* Horizontal on desktop */
      ">
        <button className="px-3 py-2 bg-blue-600 rounded text-sm">
          View Details
        </button>
        <button className="px-3 py-2 bg-yellow-600 rounded text-sm">
          Force Advance
        </button>
      </div>
    </div>
  );
}
```

---

### Admin Dashboard Summary

**What You Get:**

1. **Dashboard Page:**
   - See all active games at a glance
   - System health metrics (error rate, latency)
   - Quick actions (force advance, end game)

2. **Room Details Page:**
   - Deep dive into specific game
   - Player connection status
   - Recent actions and events
   - Admin interventions

3. **Live Logs Page:**
   - Real-time event stream
   - Filterable by room, level, keyword
   - Export for post-mortem analysis

4. **Mobile Support:**
   - Works on phone (you're walking around venue)
   - Touch-friendly buttons
   - Responsive layout

**Time to Build:**
- Day 10: Dashboard + Room Details (8 hours)
- Day 11: Live Logs + Polish (6 hours)
- Total: 14 hours (2 days as scheduled)

**Priority:** HIGH - Essential for IRL event

---

## Remote Config with Firebase

### Overview

**Problem:** During IRL event, you need to change configuration quickly without:
- Losing old versions (audit trail)
- Breaking active games (consistency)
- Deploying code
- Reinventing the wheel (version control, admin UI, SDKs)

**Solution:** Firebase Remote Config

### Why Firebase Remote Config?

| Feature | Firebase | ConfigCat | Flagsmith |
|---------|----------|-----------|-----------|
| **Pricing** | **FREE** (unlimited) | Free → $49/mo | Free (self-host) |
| **Version History** | **300 versions** (1-click rollback) | Audit log only | Audit log only |
| **Audit Trail** | Who/what/when/how | Who/what/when | Who/what/when |
| **Ecosystem** | **Google Cloud** (same as Cloud Run) | Standalone | Standalone |
| **Server SDK** | ✅ Python (firebase-admin) | ✅ Node.js | ✅ Node.js/Python |
| **Admin UI** | ✅ Firebase Console | ✅ ConfigCat dashboard | ✅ Flagsmith dashboard |
| **A/B Testing** | ✅ 24 concurrent experiments | ✅ (paid) | ✅ |
| **Parameter Limit** | **3,000 per template** | 10 → 100 → ∞ (paid) | Unlimited |

**Why Firebase Wins:**
- ✅ **Completely free** (no paid tier needed)
- ✅ **Already in Google Cloud** (same ecosystem as Cloud Run)
- ✅ **300 version history** with one-click rollback
- ✅ **Python Admin SDK** (perfect for Matrix server)
- ✅ **Separate server templates** (not exposed to clients)

### What You'll Configure

Instead of just prompts, manage **all runtime config**:

```json
{
  "prompt_system": "You are a Game Master...",
  "prompt_consequence": "Generate consequences...",
  "prompt_action_options": "Generate 5 actions...",
  "prompt_counterfactual": "What if no one acted?",
  "prompt_agent_dialogue": "You are an AI agent...",

  "game_timer_seconds": 300,
  "game_max_rounds": 5,
  "game_action_points": 3,

  "feature_multiplayer_enabled": false,
  "feature_debug_mode": false,

  "ai_model": "gpt-4o-mini",
  "ai_temperature": 0.7,
  "ai_max_tokens": 2000,

  "netlogo_model_path": "/models/election_crisis.nlogo",
  "mesa_agent_count": 50
}
```

### Firebase Setup

**1. Create Firebase Project:**

```bash
# Firebase Console: https://console.firebase.google.com
# 1. Create new project (or use existing)
# 2. Go to Remote Config
# 3. Create server template (separate from client template)
```

**2. Add Parameters in Firebase Console:**

For each parameter above, create in Firebase Console:
- Key: `prompt_system`
- Type: String
- Default value: "You are a Game Master..."

**3. Download Service Account Key:**

```bash
# Firebase Console → Project Settings → Service Accounts
# Generate new private key → Download JSON
# Save as: matrix-server/firebase-service-account.json
```

---

