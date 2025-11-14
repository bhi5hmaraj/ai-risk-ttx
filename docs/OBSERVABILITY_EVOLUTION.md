# Observability Evolution: From MVP to Multi-Service

**Decision:** Start with Sentry, upgrade to OpenTelemetry when adding Matrix

---

## Phase 1: Single Service (Today) - Use Sentry

**Architecture:**
```
Next.js + Colyseus (single service)
└─ Direct LLM calls
```

**Setup:** 2 lines
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

**What you get:**
- ✅ Error tracking (automatic)
- ✅ Performance monitoring (automatic)
- ✅ Session replay (see what user saw when error happened)
- ✅ LLM call tracking (add custom spans)

**Cost:** Free tier (5K events/month)

---

## Phase 2: Two Services - Sentry Distributed Tracing

**Architecture:**
```
Next.js + Colyseus ─→ Matrix (Python)
```

**How Sentry traces across services:**

### 1. Propagate Trace Headers

**In Stein (TypeScript):**
```typescript
import * as Sentry from "@sentry/node";

async function callMatrix(roomId: string) {
  const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();

  // Sentry creates trace headers automatically
  const response = await fetch(`${MATRIX_URL}/intelligence/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Sentry injects these automatically via fetch instrumentation
      'sentry-trace': transaction?.toTraceparent(),
      'baggage': transaction?.toBaggage(),
    },
    body: JSON.stringify({ roomId }),
  });

  return response.json();
}
```

**In Matrix (Python):**
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="YOUR_SENTRY_DSN",
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
)

@app.post("/intelligence/respond")
async def respond(request: Request):
    # Sentry automatically continues the trace from headers
    # sentry-trace and baggage headers are read automatically

    # Your logic here
    result = await generate_ai_response(...)

    return result
```

### 2. What You See in Sentry Dashboard

```
Trace: User submitted action → AI response
├─ [Next.js] POST /api/game/action (120ms)
│  └─ [Stein] GameRoom.handleAction (2500ms)
│     └─ [HTTP] POST matrix/intelligence/respond (2400ms)
│        └─ [Matrix] generate_ai_response (2350ms)
│           └─ [OpenAI] chat.completions.create (2300ms)
```

**Single trace ID** connects all services. Click any span, see full context.

---

## Phase 3: Three Services - Upgrade to OpenTelemetry

**Architecture:**
```
Next.js ─→ Stein ─→ Matrix
```

**Why upgrade at 3+ services:**
- ✅ Vendor-neutral (not locked to Sentry)
- ✅ Better multi-service correlation
- ✅ More detailed spans (auto-instruments libraries)
- ✅ Can send to multiple backends (Sentry + Prometheus + Grafana)

**Migration:** Sentry → OTel is smooth (Sentry supports OTel ingestion)

### OpenTelemetry Setup

**Install:**
```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
pip install opentelemetry-distro opentelemetry-exporter-otlp
```

**Stein (TypeScript):**
```typescript
// instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'https://ingest.sentry.io/api/YOUR_PROJECT/envelope/', // Sentry OTel endpoint
    headers: {
      'Authorization': `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
    },
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
```

**Matrix (Python):**
```python
# app.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

# Configure OTel
provider = TracerProvider()
processor = BatchSpanProcessor(
    OTLPSpanExporter(
        endpoint="https://ingest.sentry.io/api/YOUR_PROJECT/envelope/",
        headers={"Authorization": f"Bearer {SENTRY_AUTH_TOKEN}"},
    )
)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Auto-instrument FastAPI
FastAPIInstrumentor.instrument_app(app)
```

**What you get:**
- ✅ Auto-instrumentation (database queries, HTTP calls, etc.)
- ✅ Cross-service correlation (single trace ID)
- ✅ Sentry still shows traces (uses OTel data)
- ✅ Can add Prometheus/Grafana without changing code

---

## Comparison: Sentry vs OpenTelemetry

| Feature | Sentry | OpenTelemetry |
|---------|--------|---------------|
| **Setup complexity** | 2 lines | ~50 lines |
| **Single service** | ✅ Perfect | ⚠️ Overkill |
| **2 services** | ✅ Good | ✅ Good |
| **3+ services** | ⚠️ Limited | ✅ Excellent |
| **Vendor lock-in** | ⚠️ Sentry only | ✅ Send anywhere |
| **Auto-instrumentation** | ⚠️ Manual spans | ✅ Automatic |
| **Error tracking** | ✅ Built-in | ⚠️ Separate tool |
| **Session replay** | ✅ Built-in | ❌ Not included |
| **Cost (free tier)** | 5K events/month | Unlimited (self-host) |

---

## Recommended Evolution Path

### Milestone 1: Custom Server (Today)

**Use:** Sentry only

```typescript
// server.ts
import { initSentry } from './lib/sentry';
initSentry();

// game-server/lib/ai.ts
import { trackLLMCall } from './lib/sentry';

const response = await trackLLMCall('generate_actions', async () => {
  return await openai.chat.completions.create(...);
});
```

**Setup time:** 10 minutes
**Maintenance:** Zero (automatic updates)

### Milestone 2: Add Matrix Service

**Option A:** Keep Sentry, add trace headers (good enough)

```typescript
// Stein
const response = await fetch(MATRIX_URL, {
  headers: {
    'sentry-trace': Sentry.getCurrentHub().getScope()?.getTransaction()?.toTraceparent(),
  }
});

// Matrix (Python)
# Sentry auto-reads sentry-trace header
```

**Setup time:** 5 minutes per service
**Trace depth:** 3 levels (Next.js → Stein → Matrix)

**Option B:** Upgrade to OpenTelemetry (future-proof)

```bash
# One-time migration
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

**Setup time:** 1 hour (one-time)
**Trace depth:** Unlimited
**Flexibility:** Can add more backends later

---

## Decision Framework

**Use Sentry if:**
- ✅ Single service or 2 services
- ✅ Want minimal setup
- ✅ Error tracking is priority
- ✅ Free tier is enough

**Upgrade to OpenTelemetry if:**
- ✅ 3+ services
- ✅ Need deep auto-instrumentation
- ✅ Want vendor flexibility
- ✅ Have time for setup

---

## Concrete Setup: Sentry Distributed Tracing (Phase 2)

### Step 1: Install Sentry in Both Services

**Stein:**
```bash
npm install @sentry/node @sentry/tracing
```

**Matrix:**
```bash
pip install sentry-sdk[fastapi]
```

### Step 2: Initialize with Same DSN

**Stein (server.ts):**
```typescript
import * as Sentry from "@sentry/node";
import "@sentry/tracing";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
});
```

**Matrix (app.py):**
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    traces_sample_rate=0.1,
    integrations=[FastApiIntegration()],
)
```

### Step 3: Make HTTP Calls (Trace Propagates Automatically)

**Stein:**
```typescript
// Sentry automatically injects trace headers into fetch calls
const response = await fetch(`${MATRIX_URL}/intelligence/respond`, {
  method: 'POST',
  body: JSON.stringify({ roomId, context }),
});
```

**Matrix:**
```python
# Sentry automatically continues trace from headers
@app.post("/intelligence/respond")
async def respond(request: Request):
    # This span is part of the same trace!
    with sentry_sdk.start_span(op="ai", description="generate_response"):
        result = await call_openai(...)
    return result
```

### Step 4: View in Sentry Dashboard

Navigate to: **Performance → Traces**

You'll see:
```
[120ms] POST /api/game/action
  └─ [2500ms] GameRoom.handleAction
      └─ [2400ms] HTTP POST matrix/respond
          └─ [2350ms] generate_response
              └─ [2300ms] openai.chat.completions
```

Click any span → See full context:
- Request headers
- Response body
- User ID
- Room ID
- Error (if any)
- Logs around that time

---

## What About Logs?

**Phase 1-2:** Use Sentry breadcrumbs (free)

```typescript
Sentry.addBreadcrumb({
  category: 'game',
  message: 'Round advanced',
  data: { roomId, round: 5 },
});
```

**Phase 3:** Add structured logging (if needed)

- **Cloud Run native:** JSON logs → Cloud Logging (free, basic)
- **Better solution:** Axiom (free tier: 500 GB/month, 30 day retention)
  - Structured logs + traces correlated
  - Fast search (< 1s for 100GB)
  - No sampling (unlike Sentry)

```typescript
// axiom.ts (optional)
import { Axiom } from '@axiomhq/js';

const axiom = new Axiom({ token: process.env.AXIOM_TOKEN });

axiom.ingest('simulacra', [{
  timestamp: new Date(),
  level: 'info',
  message: 'Round advanced',
  roomId,
  round: 5,
  traceId: Sentry.getCurrentHub().getScope()?.getTransaction()?.traceId,
}]);
```

Now Sentry traces link to Axiom logs (via traceId).

---

## Cost Breakdown

### MVP (Milestone 1)

- **Sentry Free:** 5K events/month → ~160 events/day
  - 100 users/day × 10 sessions × 5 errors = 5K events
  - Performance: 10% sampling = fine for MVP
- **PostHog Free:** 1M events/month → ~33K events/day
  - Plenty for feature flags + basic analytics
- **Total:** $0/month

### Growth (10K MAU)

- **Sentry Team:** $26/month (50K events)
- **PostHog:** Still free (under 1M events)
- **Total:** $26/month

### Scale (100K MAU, 3 services)

- **Sentry Business:** $99/month (500K events)
- **Axiom:** Free tier (500GB logs)
- **PostHog:** $450/month (10M events) OR self-host free
- **Total:** ~$550/month

---

## Summary: Evolution Path

| Milestone | Services | Tool | Setup Time | Cost |
|-----------|----------|------|------------|------|
| **1** | Next.js+Colyseus | Sentry | 10 min | $0 |
| **2** | +Matrix | Sentry (distributed) | 15 min | $0-26 |
| **3** | 3+ services | Upgrade to OTel | 1 hour | $100+ |

**Recommendation:**
1. **Start with Sentry** (today)
2. **Add Matrix with Sentry trace headers** (when needed)
3. **Upgrade to OpenTelemetry** (if you hit 3+ services and need deep instrumentation)

You can always upgrade later. Sentry → OTel migration is smooth (Sentry ingests OTel data).

---

## Next Steps

**Today (10 minutes):**
1. Sign up for Sentry: https://sentry.io
2. Copy DSN
3. Add 2 lines to `server.ts`:
   ```typescript
   import { initSentry } from './lib/sentry';
   initSentry();
   ```
4. Deploy
5. Check Sentry dashboard for errors/performance

**When you add Matrix (15 minutes):**
1. Install Sentry in Matrix: `pip install sentry-sdk`
2. Use same DSN
3. Traces automatically connect

**If you hit 3+ services (1 hour):**
1. Migrate to OpenTelemetry
2. Keep Sentry as backend (or switch to self-hosted)

---

**Document Owner:** Engineering
**Last Updated:** 2025-11-14
