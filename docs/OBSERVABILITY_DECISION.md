# Observability & Feature Flags Decision

**Date:** 2025-11-14
**Status:** Final
**Timeline:** Week 1-3 (MVP), Post-IRL event (Analytics)

---

## Decision Summary

**Use for MVP (Week 1-3):**
- ✅ **Sentry** - Error tracking + distributed tracing
- ✅ **Env Vars** - Simple feature flags (Cloud Run console)

**Defer to Post-IRL Event:**
- ⏳ **PostHog** - Product analytics + session replay
- ⏳ **Advanced feature flags** - JSON payloads, A/B testing

---

## Why This Split?

### What Matters for Week 1-3 (IRL Event)

**Critical:**
- Game doesn't crash (Sentry catches errors)
- Connection is reliable (Sentry tracks latency)
- Can toggle features quickly (env vars via Cloud Run console)

**Not Critical:**
- Session replay (nice-to-have, not blocking)
- Complex A/B testing (overkill for 50-100 users)
- Product analytics (gather after IRL event)

### What Matters Post-Event

**After IRL event, you'll want:**
- Which features did users actually use? (PostHog analytics)
- Where did users get stuck? (Session replay)
- Which prompt variant performed better? (A/B testing)

**But you won't know WHAT to measure until after the event.**

---

## Week 1-3 Setup (15 minutes)

### 1. Sentry (10 minutes)

**Sign up:** https://sentry.io (free tier)

**Add to .env:**
```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/yyy
```

**Add to server.ts:**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

**Deploy. Done.**

### 2. Env Var Feature Flags (5 minutes)

**Add to .env.local:**
```bash
# Feature flags (simple on/off)
FEATURE_USE_COLYSEUS=true
FEATURE_HUMAN_CHAT=true
FEATURE_SPECTATOR_MODE=false

# Gradual rollout (0-100)
FEATURE_NEW_PROMPT=rollout:10
```

**Use in code:**
```typescript
// Simple check
const useColyseus = process.env.FEATURE_USE_COLYSEUS === 'true';

// Rollout check (percentage-based)
function isRolledOut(feature: string, userId: string): boolean {
  const value = process.env[feature];
  if (!value?.startsWith('rollout:')) return value === 'true';

  const pct = parseInt(value.split(':')[1]);
  const hash = hashUserId(userId) % 100;
  return hash < pct;
}

if (isRolledOut('FEATURE_NEW_PROMPT', userId)) {
  // Use new prompt
}
```

**Toggle features in Cloud Run console:**
1. Go to Cloud Run → Service → Edit & Deploy New Revision
2. Add/change env var: `FEATURE_USE_COLYSEUS=false`
3. Deploy (< 1 minute)

---

## Post-Event Setup (When Ready)

### When to Add PostHog

**Add PostHog when you need to answer:**
- Which features are users actually using?
- Where are users dropping off?
- What UI elements are they clicking?
- Which prompt variant leads to better engagement?

**Timeline:** After IRL event, when you have real usage data to analyze

### PostHog Setup (30 minutes)

**Sign up:** https://posthog.com (free tier: 1M events/month)

**Install:**
```bash
npm install posthog-js posthog-node
```

**Client (React):**
```typescript
import posthog from 'posthog-js';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: 'https://app.posthog.com',
});

// Track events
posthog.capture('round_completed', {
  round: 5,
  public_score: 75,
  role: 'governor',
});

// Session replay
posthog.startSessionRecording();
```

**Server (API):**
```typescript
import { PostHog } from 'posthog-node';

const posthog = new PostHog(process.env.POSTHOG_KEY!);

// Track server events
posthog.capture({
  distinctId: userId,
  event: 'ai_response_generated',
  properties: {
    model: 'gpt-4',
    latency_ms: 2300,
    tokens: 450,
  },
});
```

---

## Cost Comparison

### Week 1-3 (MVP)

| Tool | Cost | Setup Time |
|------|------|------------|
| Sentry Free | $0/month | 10 min |
| Env Vars | $0/month | 5 min |
| **Total** | **$0/month** | **15 min** |

### Post-Event (with PostHog)

| Tool | Cost | Setup Time |
|------|------|------------|
| Sentry Free | $0/month | - |
| PostHog Free | $0/month (< 1M events) | 30 min |
| **Total** | **$0/month** | **30 min** |

### At Scale (10K MAU)

| Tool | Cost | Notes |
|------|------|-------|
| Sentry Team | $26/month | 50K errors/month |
| PostHog | $0-50/month | Depends on events |
| **Total** | **$26-76/month** | Still very cheap |

---

## Feature Flag Comparison

### Simple Env Vars (Use This for MVP)

**Pros:**
- ✅ Zero dependencies
- ✅ Change via Cloud Run console (< 1 min)
- ✅ No code changes needed
- ✅ Works for binary flags (on/off)
- ✅ Can do percentage rollout with simple hash

**Cons:**
- ⚠️ Requires redeploy to change
- ⚠️ No user targeting (everyone gets same value)
- ⚠️ No analytics (can't measure which variant wins)

**Best for:**
- Binary flags (`USE_COLYSEUS`, `ENABLE_CHAT`)
- Simple rollouts (`FEATURE_X=rollout:10`)
- MVP where you need quick toggles

### PostHog Feature Flags (Add Later)

**Pros:**
- ✅ Change without redeploy (instant)
- ✅ User targeting (premium users, beta testers)
- ✅ A/B testing with analytics (which variant wins)
- ✅ JSON payloads (return entire config objects)
- ✅ Gradual rollout with monitoring

**Cons:**
- ⚠️ External dependency
- ⚠️ Network call on each check (cache helps)
- ⚠️ More complex setup

**Best for:**
- A/B testing prompts (which prompt gets better engagement)
- User-specific config (premium vs free)
- Complex rollouts (10% → 50% → 100% with monitoring)

---

## Example: Env Var Feature Flag Implementation

### Server-Side (TypeScript)

```typescript
// lib/features.ts (simplified)

export function isFeatureEnabled(feature: string, userId?: string): boolean {
  const envKey = `FEATURE_${feature}`;
  const value = process.env[envKey];

  if (!value) return false;

  // Simple on/off
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;

  // Rollout percentage
  if (value.startsWith('rollout:') && userId) {
    const percentage = parseInt(value.split(':')[1]);
    return hashUserId(userId) % 100 < percentage;
  }

  return false;
}

function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
  }
  return Math.abs(hash);
}

// Usage
if (isFeatureEnabled('USE_COLYSEUS', userId)) {
  // Use Colyseus
} else {
  // Use SSE
}
```

### Client-Side (React)

```typescript
// hooks/useFeature.ts

export function useFeature(feature: string): boolean {
  // Read from Next.js public env vars
  const envKey = `NEXT_PUBLIC_FEATURE_${feature}`;
  return process.env[envKey] === 'true';
}

// Usage
function GameScreen() {
  const useColyseus = useFeature('USE_COLYSEUS');
  const enableChat = useFeature('HUMAN_CHAT');

  return (
    <div>
      {useColyseus ? <ColyseusGame /> : <SSEGame />}
      {enableChat && <ChatBox />}
    </div>
  );
}
```

### Cloud Run Deployment

```bash
# Deploy with feature flags
gcloud run deploy simulacra \
  --source . \
  --region us-central1 \
  --set-env-vars="FEATURE_USE_COLYSEUS=true,FEATURE_HUMAN_CHAT=true"

# Toggle feature (redeploy)
gcloud run services update simulacra \
  --update-env-vars="FEATURE_USE_COLYSEUS=false"
```

---

## Migration Path: Env Vars → PostHog (Future)

When you're ready to add PostHog, migration is simple:

**Before (Env Vars):**
```typescript
const useNewPrompt = isFeatureEnabled('NEW_PROMPT', userId);
```

**After (PostHog):**
```typescript
import { getFlag } from './lib/posthog';

const useNewPrompt = await getFlag('new-prompt', userId, false);
```

**Call sites don't change**, just swap the implementation.

---

## What to Measure Post-Event

After IRL event, you'll want to add PostHog to answer:

**User Behavior:**
- Which roles are most popular?
- How long do games take on average?
- Where do users get stuck?
- What actions do they choose most?

**Feature Performance:**
- Does chat increase engagement?
- Do spectators stay to watch?
- Which prompt variant gets better feedback?

**Technical Metrics:**
- Client-side errors (via session replay)
- UI interactions (heatmaps)
- Feature adoption rates

**But you won't know WHAT to measure until you see users actually play.**

---

## Summary

### Week 1-3 (Do This)

**Setup (15 minutes):**
1. Add Sentry for errors + tracing
2. Use env vars for feature flags

**Benefits:**
- Catch errors before IRL event
- Toggle features via Cloud Run console
- Zero external dependencies
- Free

### Post-Event (Do Later)

**Setup (30 minutes):**
1. Add PostHog for analytics
2. Enable session replay
3. Set up A/B tests based on learnings

**Benefits:**
- See which features users love
- Understand drop-off points
- Optimize based on real data

---

## Decision Rationale

**Why not PostHog now?**
- Don't know what to measure yet (need IRL event data first)
- Session replay is cool but not blocking
- Env vars are sufficient for binary flags
- One less thing to debug during event

**Why Sentry now?**
- Errors will happen (need to know about them)
- Distributed tracing helps debug issues
- Free tier is generous
- 10 min setup, zero maintenance

**Why env vars for flags?**
- Can toggle via Cloud Run console
- No code changes needed
- Works for simple on/off
- Can do percentage rollout with basic hash

---

**Document Owner:** Engineering
**Last Updated:** 2025-11-14
**Next Review:** After IRL event
