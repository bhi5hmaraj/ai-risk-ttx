# Unified Cloud Run Deployment Strategy

**Status**: Updated 2025-11-30
**Scope**: Deploy both Next.js and Colyseus on Cloud Run to avoid Vercel limits and simplify architecture

## Why Cloud Run for Everything?

**Problem**: Approaching Vercel free tier limits (899K/1M function invocations)
**Solution**: Deploy entire stack to Cloud Run

**Benefits**:
- **Cost Control**: No surprise Vercel overages, predictable GCP billing
- **Unified Platform**: Single cloud provider, simpler ops
- **Lower Latency**: Frontend and backend in same GCP region
- **Easier CORS**: Both services in same domain/network
- **Better Scaling**: Cloud Run autoscaling for both services

## Architecture: Two Cloud Run Services

```
┌─────────────────────────────────────────────────────────┐
│                     Cloud Run                            │
│                                                          │
│  ┌──────────────────────┐      ┌───────────────────┐   │
│  │   simulacra-web      │      │  simulacra-game   │   │
│  │   (Next.js SSR)      │◄────►│  (Colyseus WS)    │   │
│  │   Port 8080          │      │  Port 3000        │   │
│  │                      │      │                   │   │
│  │  - SSR pages         │      │  - Game rooms     │   │
│  │  - API routes        │      │  - WebSockets     │   │
│  │  - Static assets     │      │  - Snapshot API   │   │
│  └──────────────────────┘      └───────────────────┘   │
│         ▲                              ▲                │
│         │                              │                │
└─────────┼──────────────────────────────┼────────────────┘
          │                              │
          │                              │
     HTTPS (web)                    WSS (game)
          │                              │
          │                              │
      ┌───▼──────────────────────────────▼────┐
      │         simulacra.cc                  │
      │  (Cloud Load Balancer + Cloud CDN)   │
      └───────────────────────────────────────┘
```

### Service 1: simulacra-web (Next.js)
- **Image**: Next.js standalone build
- **Port**: 8080 (Cloud Run default)
- **Path**: `/` (all non-WebSocket traffic)
- **Scaling**: Min 0, Max 10 (can scale to zero)
- **Features**:
  - SSR for `/game/[gameId]` using Colyseus snapshot endpoint
  - API routes for non-game logic (mail, events, admin)
  - Static assets via Cloud CDN
  - Prisma for database access

### Service 2: simulacra-game (Colyseus)
- **Image**: Colyseus server build
- **Port**: 3000 (or configurable via PORT env)
- **Path**: `/ws/*`, `/games/*`, `/colyseus-admin`, `/healthz`
- **Scaling**: Min 1, Max 1 (MVP), Min 1, Max N (with Redis Presence)
- **Features**:
  - WebSocket game rooms
  - Snapshot endpoint for SSR
  - Health checks
  - Colyseus Monitor

## Domain & Routing

### Option A: Single Domain with Path-Based Routing (Recommended)
Use Cloud Load Balancer to route by path:

```
https://simulacra.cc/              → simulacra-web
https://simulacra.cc/game/ABC123   → simulacra-web (SSR)
https://simulacra.cc/api/*         → simulacra-web (API routes)

wss://simulacra.cc/ws              → simulacra-game (WebSocket upgrade)
https://simulacra.cc/games/*/snapshot → simulacra-game (HTTP)
https://simulacra.cc/healthz       → simulacra-game (health)
```

### Option B: Subdomain Routing (Simpler for MVP)
Use separate subdomains:

```
https://simulacra.cc               → simulacra-web
https://app.simulacra.cc           → simulacra-web

wss://game.simulacra.cc            → simulacra-game (WebSocket)
https://game.simulacra.cc/healthz  → simulacra-game (HTTP)
```

**For MVP, we'll use Option B** (subdomain routing) - simpler setup, clearer separation.

## Environment Variables

### simulacra-web (Next.js)
```bash
# Runtime
NODE_ENV=production
PORT=8080

# Public (embedded in client bundle)
NEXT_PUBLIC_COLYSEUS_URL=wss://game.simulacra.cc
NEXT_PUBLIC_COLYSEUS_HTTP_BASE=https://game.simulacra.cc
NEXT_PUBLIC_APP_URL=https://simulacra.cc
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from-secret>

# Server-side (from Secret Manager)
DATABASE_URL=<from-secret>
LITELLM_API_KEY=<from-secret>
LITELLM_BASE_URL=https://asgard.bhishmaraj.org
LLM_MODEL=gpt-4o-mini
CLERK_SECRET_KEY=<from-secret>
ADMIN_EMAILS=<from-secret>
```

### simulacra-game (Colyseus)
```bash
# Runtime
NODE_ENV=production
PORT=3000

# Public (for CORS)
NEXT_PUBLIC_APP_URL=https://simulacra.cc

# Server-side (from Secret Manager)
DATABASE_URL=<from-secret>
LITELLM_API_KEY=<from-secret>
LITELLM_BASE_URL=https://asgard.bhishmaraj.org
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=<from-secret>
ADMIN_EMAILS=<from-secret>
```

## Build & Deploy Configuration

### Dockerfile Strategy

We'll create **two separate Dockerfiles**:
1. `Dockerfile` (existing) → Colyseus server
2. `Dockerfile.web` (new) → Next.js web app

This keeps builds clean and fast.

### Cloud Build Configuration

Update `cloudbuild.yaml` to build and deploy both services:

```yaml
steps:
  # Step 1: Build Next.js image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'Dockerfile.web'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/simulacra/web:$COMMIT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/simulacra/web:latest'
      - '.'
    id: 'build-web'

  # Step 2: Build Colyseus image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'Dockerfile'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/simulacra/game:$COMMIT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/simulacra/game:latest'
      - '--build-arg'
      - 'OPENAI_API_KEY=dummy'
      - '.'
    id: 'build-game'

  # Step 3: Push images
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '--all-tags', 'us-central1-docker.pkg.dev/$PROJECT_ID/simulacra/web']
    waitFor: ['build-web']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '--all-tags', 'us-central1-docker.pkg.dev/$PROJECT_ID/simulacra/game']
    waitFor: ['build-game']

  # Step 4: Deploy Next.js web service
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        SERVICE_NAME="simulacra-web-preview"
        if [ "$BRANCH_NAME" == "main" ]; then
          SERVICE_NAME="simulacra-web-prod"
        fi

        gcloud run deploy $SERVICE_NAME \
          --image us-central1-docker.pkg.dev/$PROJECT_ID/simulacra/web:$COMMIT_SHA \
          --region us-central1 \
          --platform managed \
          --allow-unauthenticated \
          --memory 1Gi \
          --cpu 1 \
          --timeout 300 \
          --min-instances 0 \
          --max-instances 10 \
          --set-env-vars NODE_ENV=production,PORT=8080,NEXT_PUBLIC_APP_URL=https://simulacra.cc,NEXT_PUBLIC_COLYSEUS_URL=wss://game.simulacra.cc,NEXT_PUBLIC_COLYSEUS_HTTP_BASE=https://game.simulacra.cc \
          --set-secrets=DATABASE_URL=DATABASE_URL:latest,LITELLM_API_KEY=LITELLM_API_KEY:latest,CLERK_SECRET_KEY=CLERK_SECRET_KEY:latest,ADMIN_EMAILS=ADMIN_EMAILS:latest,NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:latest

  # Step 5: Deploy Colyseus game service
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        SERVICE_NAME="simulacra-game-preview"
        if [ "$BRANCH_NAME" == "main" ]; then
          SERVICE_NAME="simulacra-game-prod"
        fi

        gcloud run deploy $SERVICE_NAME \
          --image us-central1-docker.pkg.dev/$PROJECT_ID/simulacra/game:$COMMIT_SHA \
          --region us-central1 \
          --platform managed \
          --allow-unauthenticated \
          --memory 1Gi \
          --cpu 1 \
          --timeout 3600 \
          --session-affinity \
          --min-instances 1 \
          --max-instances 1 \
          --set-env-vars NODE_ENV=production,PORT=3000,NEXT_PUBLIC_APP_URL=https://simulacra.cc \
          --set-secrets=OPENAI_API_KEY=OPENAI_API_KEY:latest,DATABASE_URL=DATABASE_URL:latest,LITELLM_API_KEY=LITELLM_API_KEY:latest,ADMIN_EMAILS=ADMIN_EMAILS:latest

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/simulacra/web:$COMMIT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/simulacra/web:latest'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/simulacra/game:$COMMIT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/simulacra/game:latest'
```

## Next.js Dockerfile (Dockerfile.web)

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm i --frozen-lockfile

# Build Next.js
FROM base AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm exec prisma generate || echo "Prisma generate skipped"

# Build Next.js (standalone output)
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

## DNS Configuration

```
# A records pointing to Cloud Load Balancer IP
simulacra.cc          → <load-balancer-ip>
game.simulacra.cc     → <load-balancer-ip>

# Or separate Cloud Run URLs for preview:
simulacra-web-preview-uc.a.run.app
simulacra-game-preview-uc.a.run.app
```

## Migration Path from Vercel

### Phase 1: Test Cloud Run (Current)
- ✅ Test Colyseus Docker build locally
- ⏳ Create Dockerfile.web for Next.js
- ⏳ Test Next.js build locally
- ⏳ Deploy both to Cloud Run preview

### Phase 2: Preview Environment
- Deploy to `*-preview.a.run.app` URLs
- Test end-to-end: SSR, WebSocket, API routes
- Verify performance and scaling

### Phase 3: Production Cutover
- Set up custom domains (simulacra.cc, game.simulacra.cc)
- Configure Cloud Load Balancer or Cloud DNS
- Update GitHub secrets for production deploy
- Migrate database if needed (or keep existing)

### Phase 4: Sunset Vercel
- Stop Vercel deployments
- Remove Vercel-specific configs
- Update documentation

## Cost Comparison

### Vercel Free Tier (Current)
- Function invocations: 899K/1M (near limit)
- Edge requests: 469K/1M
- **Risk**: Overages = $20/million invocations

### Cloud Run (Estimated)
**Next.js Web Service**:
- CPU: 1 vCPU × ~2h/day active = ~60 vCPU-hours/month = ~$2.40
- Memory: 1GB × ~2h/day = ~60 GB-hours/month = ~$0.65
- Requests: 1M requests = ~$0.40
- **Total**: ~$3.50/month

**Colyseus Game Service** (always-on, min-instances=1):
- CPU: 1 vCPU × 730 hours = $52.56/month
- Memory: 1GB × 730 hours = $7.30/month
- Requests: minimal (WebSocket connections)
- **Total**: ~$60/month

**Grand Total**: ~$63.50/month vs potential Vercel overages

**Note**: Colyseus can scale to min=0 after adding Redis Presence, reducing cost to ~$10/month total.

## CORS Configuration

Update `server/index.ts` CORS to allow Cloud Run web service:

```typescript
expressApp.use(cors({
    origin: function (origin: string | undefined, callback) {
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'https://simulacra.cc',
            'https://game.simulacra.cc',
            'https://simulacra-web-preview-uc.a.run.app',
            'https://simulacra-game-preview-uc.a.run.app',
            process.env.NEXT_PUBLIC_APP_URL
        ].filter(Boolean) as string[];

        if (origin.includes('localhost') || origin.endsWith('.a.run.app')) {
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS not allowed'), false);
        }
        return callback(null, true);
    }
}));
```

## Next Steps

1. Create `Dockerfile.web` for Next.js standalone build
2. Update `next.config.mjs` to enable standalone output
3. Test local Next.js Docker build
4. Update `cloudbuild.yaml` for multi-service deploy
5. Deploy to preview environment
6. Test end-to-end functionality
7. Set up custom domains
8. Production deploy

---

**Questions?** See `/logging/README.md` for logging setup and `DEPLOYMENT_SETUP.md` for detailed GCP configuration.
