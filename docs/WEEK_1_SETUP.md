# Week 1-3 Setup: Bare Essentials

**Goal:** Ship Colyseus migration with reliable error tracking and simple feature toggles

**Timeline:** 15 minutes setup, 1-2 days migration

---

## What You Actually Need

### 1. Sentry (Error Tracking) - 10 minutes

**Why:** Know when game breaks before users tell you

**Setup:**

1. Sign up: https://sentry.io/signup (free tier)

2. Get DSN from project settings

3. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://abc123@o123.ingest.sentry.io/456
   ```

4. Add to `server.ts` (top of file):
   ```typescript
   import * as Sentry from "@sentry/nextjs";

   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     tracesSampleRate: 0.1, // 10% of transactions
     environment: process.env.NODE_ENV,
   });
   ```

5. Deploy

**That's it.** Sentry now tracks:
- ✅ Errors (with stack traces)
- ✅ Performance (slow API calls)
- ✅ User context (who hit the error)

**View errors:** https://sentry.io → Projects → Your Project

### 2. Feature Flags (Env Vars) - 5 minutes

**Why:** Toggle features without code changes

**Setup:**

1. Add to `.env.local`:
   ```bash
   # Binary flags (on/off)
   FEATURE_USE_COLYSEUS=true
   FEATURE_HUMAN_CHAT=false

   # Gradual rollout (10% of users)
   FEATURE_NEW_PROMPT=rollout:10
   ```

2. Use in code:
   ```typescript
   import { isFeatureEnabled } from './lib/features-simple';

   if (isFeatureEnabled('USE_COLYSEUS', userId)) {
     // Use Colyseus
   } else {
     // Use SSE
   }
   ```

3. Toggle in Cloud Run console:
   - Go to Cloud Run → Service → Edit
   - Change env var: `FEATURE_USE_COLYSEUS=false`
   - Deploy (< 1 minute)

**That's it.** No external service needed.

---

## What You DON'T Need (Yet)

### ❌ PostHog
- Session replay is cool but not critical
- Product analytics are useless without users
- Add **after IRL event** when you have data to analyze

### ❌ Complex Feature Flags
- JSON payloads are overkill for binary flags
- A/B testing needs traffic to be meaningful
- Env vars work fine for MVP

### ❌ Custom Logging
- Sentry breadcrumbs are sufficient
- Cloud Run logs exist for debugging
- Don't build custom logging infrastructure

### ❌ Metrics Dashboard
- You have < 100 users, you don't need Grafana
- Sentry performance tracking is enough
- Add dashboards when you have scale problems

---

## Installation Commands

```bash
# Install Sentry
npm install @sentry/nextjs

# No install needed for env var flags (built-in!)

# Total dependencies added: 1
# Total setup time: 15 minutes
```

---

## Cloud Run Deployment

```bash
# Deploy with Sentry + feature flags
gcloud run deploy simulacra \
  --source . \
  --region us-central1 \
  --set-env-vars="NEXT_PUBLIC_SENTRY_DSN=https://...,FEATURE_USE_COLYSEUS=true"
```

**Toggle feature without redeploying code:**
```bash
gcloud run services update simulacra \
  --update-env-vars="FEATURE_USE_COLYSEUS=false"
```

---

## What You Get

### Sentry Dashboard

**Errors Tab:**
- See all errors in real-time
- Stack traces with source maps
- User context (who hit the error)
- Breadcrumbs (what user did before error)

**Performance Tab:**
- See slow API calls
- LLM latency tracking
- WebSocket connection issues

**Alerts:**
- Email when new error appears
- Slack integration (optional)

### Feature Flags

**Toggle instantly:**
1. Go to Cloud Run console
2. Edit service → Environment variables
3. Change `FEATURE_USE_COLYSEUS=false`
4. Deploy (< 1 min)

**Gradual rollout:**
```bash
# Give 10% of users new prompt
FEATURE_NEW_PROMPT=rollout:10

# Increase to 50%
FEATURE_NEW_PROMPT=rollout:50

# Full rollout
FEATURE_NEW_PROMPT=true
```

---

## Testing Sentry

**Test error tracking:**
```typescript
// Add to any page temporarily
throw new Error('Test Sentry integration');
```

Visit page → Check Sentry dashboard → Should see error

**Test performance tracking:**
```typescript
const transaction = Sentry.startTransaction({
  name: 'test_transaction',
  op: 'test',
});

// Do something slow
await new Promise(r => setTimeout(r, 2000));

transaction.finish();
```

Check Sentry → Performance tab → Should see 2s transaction

---

## After IRL Event

**When you have real users, add:**

1. **PostHog** (Product Analytics)
   - Which features are users using?
   - Where do they drop off?
   - Session replay for debugging

2. **Better Logging** (if needed)
   - Axiom for structured logs
   - Only if Sentry breadcrumbs aren't enough

3. **Metrics Dashboard** (if scaling)
   - Grafana for system metrics
   - Only if you have performance issues

**But for Week 1-3: Sentry + Env Vars = Enough**

---

## Cost

| Tool | Free Tier | Paid (if needed) |
|------|-----------|------------------|
| Sentry | 5K events/month | $26/month (50K events) |
| Env Vars | Unlimited | Free |
| **Total** | **$0/month** | **$26/month** |

For IRL event with 50-100 users: **Free tier is plenty**

---

## Troubleshooting

**Sentry not showing errors:**
1. Check `NEXT_PUBLIC_SENTRY_DSN` is set
2. Check Sentry.init() is called in `server.ts`
3. Deploy and trigger an error
4. Wait 1-2 minutes for ingestion

**Feature flag not working:**
1. Check env var name: `FEATURE_USE_COLYSEUS` (not `USE_COLYSEUS`)
2. Check value: `true` or `false` (lowercase)
3. Redeploy after changing env vars
4. Verify in code: `console.log(process.env.FEATURE_USE_COLYSEUS)`

---

## Summary

**Do This (15 min):**
- ✅ Add Sentry for errors + performance
- ✅ Use env vars for feature flags

**Don't Do This (Yet):**
- ❌ PostHog (add after event)
- ❌ Custom logging (Sentry is enough)
- ❌ Metrics dashboard (not needed for < 100 users)

**Focus on:** Shipping Colyseus migration, making game work reliably for IRL event

---

**Last Updated:** 2025-11-14
**Next:** Follow `COLYSEUS_MIGRATION.md` to ship the migration
