# SSE Observability & Monitoring Setup

This guide explains how to monitor SSE connection health in production using the built-in instrumentation.

## 🎯 What We Track

### Server-Side Metrics (Automatic)
- **Connection lifecycle**: Open/close timestamps
- **Connection duration**: How long each connection lasted
- **Events sent**: Number of game events sent per connection
- **Heartbeats sent**: Number of pings sent
- **60s timeout detection**: Flags connections that hit Vercel's 60s limit
- **Disconnection reason**: Client abort vs server close
- **Resumption tracking**: Logs when clients resume from Last-Event-ID

### Client-Side Metrics (Automatic)
- **Connection state**: Connecting → Connected → Reconnecting → Disconnected
- **Events received**: Total game events received
- **Heartbeats received**: Total pings received
- **Reconnection attempts**: How many times client had to reconnect
- **Last event age**: Time since last event (staleness detection)
- **Connection duration**: Total uptime per connection
- **Error tracking**: Network errors, server errors, etc.

---

## 📊 Observability Options

### Option 1: Vercel Logs (Free, Built-in)

**What you see now** (already working):
```
[SVR] rid=sse-1a2b3c SSE open /api/session/abc123/stream ua="Mozilla..." lastEventId="none"
[SVR] rid=sse-1a2b3c SSE close /api/session/abc123/stream durationSec=62 eventsSent=5 heartbeatsSent=4 reason="client-abort" hit60sLimit=true
```

**Access:**
1. Go to Vercel Dashboard
2. Project → Deployments → [Click deployment] → Runtime Logs
3. Search for "SSE open" or "SSE close"

**Limitations:**
- ❌ 1-hour retention (Hobby) or 24-hour retention (Pro)
- ❌ No search/filtering
- ❌ Manual inspection only

**Good for:** Quick debugging, "is my SSE working?" checks

---

### Option 2: Axiom (Recommended for Production)

**Why Axiom:**
- ✅ Built for serverless (Edge runtime compatible)
- ✅ Generous free tier: **500GB/month**
- ✅ Fast ingest, powerful queries
- ✅ Dashboards + alerts

**Setup Steps:**

#### 1. Sign up & get API token
```bash
# Go to https://axiom.co/
# Create account → Create dataset "simulacra-logs"
# Settings → API Tokens → Create token
```

#### 2. Add environment variables
```bash
# .env.local (for local dev)
NEXT_PUBLIC_LOG_BACKEND=axiom
NEXT_PUBLIC_LOG_API_KEY=xaat-your-token-here
NEXT_PUBLIC_LOG_DATASET=simulacra-logs

# Also add to Vercel project settings
```

#### 3. Deploy
```bash
git add .
git commit -m "feat: Add Axiom observability"
git push
```

#### 4. View logs in Axiom

**Example queries:**

```apl
// All SSE connections in last hour
['simulacra-logs']
| where component == "SSE"
| where _time > ago(1h)
| project _time, level, message, sessionId, state, durationSec
```

```apl
// Find connections hitting 60s timeout
['simulacra-logs']
| where component == "SSE" and message contains "close"
| where hit60sLimit == true
| summarize count() by bin(_time, 5m)
```

```apl
// Average connection duration over time
['simulacra-logs']
| where component == "SSE" and message contains "close"
| summarize avg(durationSec) by bin(_time, 1h)
```

**Create Dashboard:**
1. Axiom → Dashboards → New Dashboard
2. Add charts:
   - **SSE Connections** (line chart): Connection rate over time
   - **60s Timeout Rate** (pie chart): % of connections hitting limit
   - **Avg Connection Duration** (line chart): Duration trend
   - **Reconnection Attempts** (bar chart): Client reconnect frequency

---

### Option 3: Better Stack (Logtail)

**Why Better Stack:**
- ✅ Simple, focused on logs
- ✅ Good UI for searching
- ✅ Cheaper than Axiom for low volume

**Setup:**

```bash
npm install @logtail/node @logtail/browser
```

```typescript
// lib/observability.ts - Update sendToLogtail() method
import { Logtail } from '@logtail/browser';

const logtail = new Logtail(process.env.NEXT_PUBLIC_LOG_API_KEY!);

private async sendToLogtail(event: LogEvent) {
  logtail.log(event.message, event.level, event.context);
}
```

**Pricing:**
- Free: 1GB/month, 3-day retention
- Starter: $10/month for 5GB

---

### Option 4: Highlight.io (Best for User Issues)

**Why Highlight:**
- ✅ **Session replay** - See exactly what user saw when SSE failed
- ✅ Logs tied to user sessions
- ✅ Error tracking

**Setup:**

```bash
npm install @highlight-run/next
```

```typescript
// app/layout.tsx
import { HighlightInit } from '@highlight-run/next/client';

export default function RootLayout({ children }) {
  return (
    <>
      <HighlightInit
        projectId={process.env.NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID!}
        serviceName="simulacra"
        tracingOrigins
        networkRecording={{
          enabled: true,
          recordHeadersAndBody: true,
        }}
      />
      {children}
    </>
  );
}
```

**Usage:**
When user reports "SSE disconnected", go to Highlight → find their session → watch replay to see:
- Exact moment connection dropped
- Network tab showing SSE requests
- Console logs with SSE events
- User's actions before/after disconnect

---

## 🔍 Monitoring Queries & Alerts

### Key Metrics to Track

#### 1. **60-Second Timeout Rate**
```sql
-- Axiom APL
['simulacra-logs']
| where component == "SSE" and hit60sLimit == true
| summarize count() by bin(_time, 1h)
| extend rate = count_ / 60.0  // connections per minute hitting limit
```

**Alert**: If rate > 10/hour → Consider switching runtimes or using Pusher

#### 2. **Reconnection Frequency**
```sql
-- Axiom APL
['simulacra-logs']
| where component == "SSE" and state == "reconnecting"
| summarize reconnects = count(), uniqueSessions = dcount(sessionId) by bin(_time, 5m)
| extend avgReconnectsPerSession = reconnects / uniqueSessions
```

**Alert**: If avgReconnectsPerSession > 3 → Network issues or server problems

#### 3. **Connection Health**
```sql
-- Axiom APL
['simulacra-logs']
| where component == "SSE" and message contains "stale"
| project _time, sessionId, lastEventAgeSec
```

**Alert**: If lastEventAgeSec > 60 → Connection is alive but no events (possible issue)

#### 4. **Client-Side Errors**
```sql
-- Axiom APL
['simulacra-logs']
| where component == "SSE" and level == "error"
| summarize count() by lastError
| order by count_ desc
```

**Shows**: Most common SSE error messages

---

## 📈 Sample Dashboards

### Axiom Dashboard Example

```json
{
  "name": "SSE Connection Health",
  "charts": [
    {
      "title": "Active Connections",
      "query": "['simulacra-logs'] | where component == 'SSE' and message contains 'open' | summarize count() by bin(_time, 1m)",
      "type": "line"
    },
    {
      "title": "60s Timeout Rate",
      "query": "['simulacra-logs'] | where hit60sLimit == true | summarize count() by bin(_time, 1h)",
      "type": "bar"
    },
    {
      "title": "Avg Connection Duration",
      "query": "['simulacra-logs'] | where message contains 'close' | summarize avg(durationSec) by bin(_time, 1h)",
      "type": "line"
    },
    {
      "title": "Reconnection Attempts",
      "query": "['simulacra-logs'] | where state == 'reconnecting' | summarize sum(reconnectionAttempts) by bin(_time, 5m)",
      "type": "area"
    }
  ]
}
```

---

## 🚨 Recommended Alerts

### 1. High Timeout Rate
```
IF hit60sLimit connections > 20/hour
THEN notify Slack/email
ACTION: Check Vercel plan, consider Pusher migration
```

### 2. Connection Errors Spike
```
IF SSE errors > 10/min
THEN notify on-call
ACTION: Check server health, database connectivity
```

### 3. Stale Connections
```
IF lastEventAgeSec > 120 seconds for any active session
THEN notify
ACTION: Check if heartbeats are being sent
```

---

## 🧪 Testing Your Observability

### 1. View Logs Locally

```bash
npm run dev

# In browser:
# 1. Open DevTools → Console
# 2. Start a game session
# 3. Watch for:
#    [SSE] ✅ EVENT RECEIVED: {...}
#    [SSE] 💓 Heartbeat received

# In terminal:
# [SVR] rid=sse-xxx SSE open /api/session/...
# [SVR] rid=sse-xxx SSE close /api/session/... durationSec=...
```

### 2. Simulate 60s Timeout

```typescript
// Temporarily change heartbeatInterval to test
// app/api/session/[[...parts]]/route.ts:270
const heartbeatInterval = 5_000; // 5s instead of 15s for faster testing
```

Start session → wait 60s → check logs for `hit60sLimit=true`

### 3. Simulate Network Drop

```bash
# DevTools → Network → Offline checkbox
# Watch for:
# [SSE] ⚠️ Connection error, will auto-retry
# [SSE] ✅ Stream opened successfully (after reconnect)
```

### 4. Check Metrics in Axiom

```bash
# After generating some traffic, go to Axiom:
# https://app.axiom.co/your-org/simulacra-logs/stream

# Run query:
['simulacra-logs']
| where component == "SSE"
| project _time, level, message, sessionId, durationSec
| order by _time desc
| limit 100
```

---

## 📊 Cost Estimates

### Monthly Log Volume Estimate

**Assumptions:**
- 100 active users/day
- 3 game sessions per user
- 5 minutes avg session duration
- 2 SSE reconnections per session (60s timeouts)

**Log events per session:**
- Server: 2 (open + close) = **600 events/day**
- Client: 10 (state changes, heartbeats) = **3,000 events/day**
- Total: **3,600 events/day** = **108,000 events/month**

**Size estimate:**
- ~500 bytes per log event
- 108k × 500 bytes = **54 MB/month**

**Costs:**
- **Axiom**: FREE (500GB/month free tier)
- **Better Stack**: FREE (1GB/month free tier)
- **Highlight**: FREE (500 sessions/month free tier)

---

## 🎯 Recommended Setup

**For Hobby/Side Project:**
1. ✅ Use Vercel logs (free, built-in)
2. ✅ Add Axiom later if you need historical data

**For Production:**
1. ✅ **Axiom** for server-side logs & metrics
2. ✅ **Highlight.io** for user session replays (when users report bugs)
3. ✅ Set up alerts for 60s timeout rate & error spikes

---

## 🔧 Environment Variables Summary

```bash
# .env.local (for local development)
NEXT_PUBLIC_LOG_BACKEND=axiom  # or "logtail" or "highlight" or "console"
NEXT_PUBLIC_LOG_API_KEY=your-api-key-here
NEXT_PUBLIC_LOG_DATASET=simulacra-logs

# Also add these to Vercel project settings:
# Settings → Environment Variables → Add all three variables
```

---

## 📝 Next Steps

1. **Choose a logging backend** (Axiom recommended)
2. **Add environment variables** to Vercel
3. **Deploy** and let logs accumulate
4. **Create dashboard** in Axiom with recommended queries
5. **Set up alerts** for critical metrics
6. **Monitor for a week** to establish baselines
7. **Tune alerts** based on actual patterns

---

## 🆘 Troubleshooting

### "I don't see any logs in Axiom"

✅ Check environment variables are set in Vercel
✅ Check NEXT_PUBLIC_LOG_BACKEND=axiom (must have NEXT_PUBLIC_ prefix for client-side)
✅ Check API key is valid
✅ Try forcing a redeployment

### "Logs only showing server-side, not client-side"

Client-side logs only sent when browser is connected. Check:
✅ Browser console for errors
✅ Network tab for failed fetch to Axiom
✅ CORS settings on Axiom (should auto-allow)

### "Too many logs!"

Reduce logging level:
```bash
# .env
LOG_LEVEL=info  # Only info, warn, error (not debug)
```

---

## 📚 Additional Resources

- [Axiom Documentation](https://axiom.co/docs)
- [Better Stack Docs](https://betterstack.com/docs/logs/)
- [Highlight.io Docs](https://www.highlight.io/docs)
- [Vercel Logs](https://vercel.com/docs/observability/runtime-logs)
