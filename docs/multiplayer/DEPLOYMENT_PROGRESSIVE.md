# Progressive Migration Deployment Strategy

This document explains our hybrid deployment approach.

## Current Architecture (Progressive Migration)

**Next.js Frontend**: Deployed on Vercel
- Optimized for serverless Next.js deployment
- Auto-preview deployments per branch
- CDN edge caching for static assets
- Zero config required

**Colyseus Game Server**: Deployed on Google Cloud Run
- WebSocket support with session affinity
- Per-branch deployments (e.g., `simulacra-colyseus-feat-xyz`)
- Custom domain for production (`game.simulacra.cc`)
- Infisical for unified secret management

## Why This Approach?

1. **Start Simple**: Vercel is already set up and works great for Next.js
2. **Migrate What's Needed**: Colyseus needs WebSocket support and session affinity
3. **Lower Risk**: Move one service at a time
4. **Future-Ready**: Can migrate Next.js to Cloud Run when traffic increases

## Deployment Files

### Current Setup (Colyseus-only)

- **`cloudbuild.yaml`** - Deploys only Colyseus to Cloud Run
- **`.github/workflows/deploy.yml`** - Triggers Colyseus deployment via Cloud Build
- **`Dockerfile.colyseus`** - Docker image for Colyseus server

### Future Migration (Full Cloud Run)

- **`cloudbuild.full.yaml`** - Backup config that deploys both Next.js + Colyseus
- **`Dockerfile.nextjs`** - Docker image for Next.js (ready to use)

When you're ready to migrate Next.js to Cloud Run:
1. Copy `cloudbuild.full.yaml` to `cloudbuild.yaml`
2. Update your DNS to point to Cloud Run URLs
3. Deploy!

## Secret Management

Both platforms use **Infisical** for unified secret management:

### Vercel (Next.js)
- Add `INFISICAL_TOKEN` to Vercel environment variables
- Secrets loaded via `instrumentation.ts` at server startup
- All secrets fetched from Infisical dynamically

### Cloud Run (Colyseus)
- `INFISICAL_TOKEN` stored in GCP Secret Manager
- Passed to Cloud Run via `--set-secrets=INFISICAL_TOKEN=INFISICAL_TOKEN:latest`
- All other secrets fetched from Infisical at runtime via `loadSecrets()`

## Deployment Workflow

### Next.js (Vercel)
```bash
git push origin your-branch  # Vercel auto-deploys
```

### Colyseus (Cloud Run)
```bash
git push origin your-branch  # GitHub Actions triggers Cloud Build
```

Or manually:
```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=BRANCH_NAME=$(git branch --show-current) .
```

## Branch Naming

Both platforms support per-branch previews:

**Vercel**: `feat-xyz.vercel.app`
**Cloud Run**: `simulacra-colyseus-feat-xyz-[hash]-us-central1.a.run.app`

**Production** (main branch):
- **Vercel**: `simulacra.cc` (or your production domain)
- **Cloud Run**: `game.simulacra.cc`

## Cost Comparison

**Vercel (Current)**:
- Free tier: Hobby projects
- Pro: $20/month (includes Next.js analytics, image optimization)

**Cloud Run (Current)**:
- Pay-per-use (billed per request + CPU time)
- ~$5-20/month for low traffic
- Scales automatically

**Future (All on Cloud Run)**:
- More predictable costs
- Single platform to manage
- Better control over infrastructure
- Trade-off: More DevOps complexity

## When to Migrate Next.js to Cloud Run?

Consider migrating when:
- Traffic grows beyond Vercel free/pro tier limits
- Need more control over infrastructure
- Want to consolidate platforms
- WebSocket connections from Next.js needed (for real-time features)

## Troubleshooting

### Vercel deployment fails
Check Vercel build logs - likely missing environment variables

### Cloud Run deployment fails
1. Check GitHub Actions logs
2. Check Cloud Build logs in GCP Console
3. Verify `INFISICAL_TOKEN` exists in GCP Secret Manager

### Secrets not loading
1. Verify `INFISICAL_TOKEN` is set correctly
2. Check Infisical dashboard for token validity
3. Check server logs for Infisical errors
4. Verify environment name matches (development/production)

## Quick Commands

```bash
# Check Colyseus deployment status
gcloud run services list --filter="metadata.name:simulacra-colyseus"

# View Colyseus logs
gcloud run services logs read simulacra-colyseus-prod --region=us-central1

# Update Colyseus service (force restart to reload secrets)
gcloud run services update simulacra-colyseus-prod --region=us-central1

# List all Cloud Build history
gcloud builds list --limit=10
```

## Next Steps

Your setup is complete! You can now:
1. Deploy Next.js to Vercel (configure `INFISICAL_TOKEN` in Vercel dashboard)
2. Deploy Colyseus to Cloud Run (via `git push`)
3. Both services will fetch secrets from Infisical at startup
4. Keep `cloudbuild.full.yaml` as reference for future full migration
