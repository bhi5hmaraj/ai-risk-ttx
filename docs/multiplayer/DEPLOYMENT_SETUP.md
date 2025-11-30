# Deployment Setup Guide

This guide walks you through setting up the two-service architecture: Next.js on Vercel and Colyseus on Cloud Run.

## Prerequisites

- GitHub account with repo access
- Google Cloud Platform account
- Vercel account
- `gcloud` CLI installed locally

## Part 1: Google Cloud Platform Setup

### 1.1 Create GCP Project

```bash
# Create project
gcloud projects create simulacra-prod --name="Simulacra Production"

# Set as active project
gcloud config set project simulacra-prod

# Enable billing (required for Cloud Run)
# Visit: https://console.cloud.google.com/billing/linkedaccount?project=simulacra-prod
```

### 1.2 Enable Required APIs

```bash
# Enable all required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 1.3 Create Artifact Registry Repository

```bash
# Create Docker repository
gcloud artifacts repositories create simulacra \
  --repository-format=docker \
  --location=us-central1 \
  --description="Simulacra Docker images"

# Verify creation
gcloud artifacts repositories list --location=us-central1
```

### 1.4 Set Up Secret Manager

```bash
# Create secrets for production
echo -n "your-openai-api-key" | gcloud secrets create OPENAI_API_KEY --data-file=-
echo -n "your-database-url" | gcloud secrets create DATABASE_URL --data-file=-
echo -n "your-litellm-api-key" | gcloud secrets create LITELLM_API_KEY --data-file=-
echo -n "your-clerk-secret-key" | gcloud secrets create CLERK_SECRET_KEY --data-file=-
echo -n "admin1@example.com,admin2@example.com" | gcloud secrets create ADMIN_EMAILS --data-file=-

# Grant Cloud Run access to secrets
PROJECT_NUMBER=$(gcloud projects describe simulacra-prod --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding LITELLM_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CLERK_SECRET_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding ADMIN_EMAILS \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 1.5 Create Service Account for GitHub Actions

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Service Account"

# Grant required permissions
gcloud projects add-iam-policy-binding simulacra-prod \
  --member="serviceAccount:github-actions@simulacra-prod.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding simulacra-prod \
  --member="serviceAccount:github-actions@simulacra-prod.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding simulacra-prod \
  --member="serviceAccount:github-actions@simulacra-prod.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@simulacra-prod.iam.gserviceaccount.com

# Display key (copy for GitHub secret)
cat github-actions-key.json
```

### 1.6 Add GitHub Secret

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `GCP_CREDENTIALS`
4. Value: Paste entire contents of `github-actions-key.json`
5. Click "Add secret"

## Part 2: Update Cloud Build Configuration

The `cloudbuild.yaml` needs to mount secrets from Secret Manager. Update step 3 to include secret environment variables:

```yaml
# Step 3: Deploy to Cloud Run (Branch-based)
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      SERVICE_NAME="simulacra-preview"
      APP_URL="https://simulacra-preview-uc.a.run.app"

      if [ "$BRANCH_NAME" == "main" ]; then
        SERVICE_NAME="simulacra-prod"
        APP_URL="https://simulacra.cc"
      fi

      echo "Deploying to $SERVICE_NAME with APP_URL=$APP_URL"

      gcloud run deploy $SERVICE_NAME \
        --image us-central1-docker.pkg.dev/$PROJECT_ID/simulacra/app:$COMMIT_SHA \
        --region us-central1 \
        --platform managed \
        --allow-unauthenticated \
        --memory 1Gi \
        --cpu 1 \
        --timeout 3600 \
        --session-affinity \
        --min-instances 1 \
        --max-instances 1 \
        --set-env-vars NODE_ENV=production,NEXT_PUBLIC_APP_URL=$APP_URL \
        --set-secrets=OPENAI_API_KEY=OPENAI_API_KEY:latest,DATABASE_URL=DATABASE_URL:latest,LITELLM_API_KEY=LITELLM_API_KEY:latest,CLERK_SECRET_KEY=CLERK_SECRET_KEY:latest,ADMIN_EMAILS=ADMIN_EMAILS:latest
```

## Part 3: Vercel Setup

### 3.1 Connect GitHub Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Framework: Next.js (auto-detected)
5. Root Directory: `./` (default)
6. Build Command: Leave default (uses `vercel.json`)
7. Output Directory: Leave default

### 3.2 Configure Environment Variables

#### Preview Environment Variables

In Vercel project settings → Environment Variables, add these for **Preview** environment:

```bash
# Colyseus WebSocket URL (Cloud Run Preview)
NEXT_PUBLIC_COLYSEUS_URL=wss://simulacra-preview-uc.a.run.app

# Colyseus HTTP Base URL (for snapshot endpoint)
NEXT_PUBLIC_COLYSEUS_HTTP_BASE=https://simulacra-preview-uc.a.run.app

# App URL (Vercel preview)
NEXT_PUBLIC_APP_URL=https://<your-project>.vercel.app

# Database (Vercel Postgres)
DATABASE_URL=<from-vercel-postgres>

# LLM Configuration
LITELLM_API_KEY=<your-litellm-api-key>
LITELLM_BASE_URL=https://asgard.bhishmaraj.org
LLM_MODEL=gpt-4o-mini

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-pub-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>

# Admin Access
ADMIN_EMAILS=<your-admin-emails>
```

#### Production Environment Variables

Add these for **Production** environment:

```bash
# Colyseus WebSocket URL (Cloud Run Production)
NEXT_PUBLIC_COLYSEUS_URL=wss://simulacra.cc

# Colyseus HTTP Base URL
NEXT_PUBLIC_COLYSEUS_HTTP_BASE=https://simulacra.cc

# App URL (Vercel production)
NEXT_PUBLIC_APP_URL=https://<your-production-domain>.vercel.app

# Database (Vercel Postgres)
DATABASE_URL=<from-vercel-postgres-prod>

# LLM Configuration
LITELLM_API_KEY=<your-litellm-api-key>
LITELLM_BASE_URL=https://asgard.bhishmaraj.org
LLM_MODEL=gpt-4o-mini

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-pub-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>

# Admin Access
ADMIN_EMAILS=<your-admin-emails>
```

### 3.3 Add Vercel Postgres (Optional)

If using Vercel Postgres instead of external database:

1. Go to Vercel project → Storage → Create Database
2. Select "Postgres"
3. Choose region closest to Cloud Run (us-central1)
4. This will automatically inject `DATABASE_URL` environment variable

## Part 4: Update Local Environment

Update `.env.example` to document the new required variables:

```bash
# Colyseus (WebSocket Server)
COLYSEUS_PORT=3004

# Frontend URLs for Colyseus connection
NEXT_PUBLIC_COLYSEUS_URL=ws://localhost:3004
NEXT_PUBLIC_COLYSEUS_HTTP_BASE=http://localhost:3004

# App URL (for CORS)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Create `.env.local` for local development:

```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

## Part 5: Test Deployment

### 5.1 Test Local Build

```bash
# Build Colyseus server
pnpm run build:server

# Verify dist/server/index.js exists
ls -la dist/server/

# Test Docker build locally
docker build -t simulacra-test .

# Run container locally
docker run -p 3004:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  simulacra-test
```

### 5.2 Test Cloud Build Locally

```bash
# Authenticate with GCP
gcloud auth login
gcloud config set project simulacra-prod

# Submit build (without deploying)
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=BRANCH_NAME=test,COMMIT_SHA=$(git rev-parse HEAD) \
  --no-source

# Or test full deploy to preview
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=BRANCH_NAME=feat/test-deploy,COMMIT_SHA=$(git rev-parse HEAD)
```

### 5.3 Verify Snapshot Endpoint

Once deployed, test the snapshot endpoint:

```bash
# Test locally
curl http://localhost:3004/healthz
curl http://localhost:3004/games/TEST123/snapshot

# Test on Cloud Run preview
curl https://simulacra-preview-uc.a.run.app/healthz
curl https://simulacra-preview-uc.a.run.app/games/TEST123/snapshot
```

### 5.4 Test WebSocket Connection

Create a test HTML file to verify WebSocket connectivity:

```html
<!DOCTYPE html>
<html>
<head>
  <title>WebSocket Test</title>
</head>
<body>
  <h1>Testing WebSocket Connection</h1>
  <div id="status"></div>
  <script src="https://unpkg.com/colyseus.js@^0.15.0/dist/colyseus.js"></script>
  <script>
    const status = document.getElementById('status');
    const client = new Colyseus.Client('wss://simulacra-preview-uc.a.run.app');

    client.joinOrCreate('game', { gameId: 'TEST123' })
      .then(room => {
        status.innerHTML = '✅ Connected to room: ' + room.id;
        console.log('Room state:', room.state);
      })
      .catch(err => {
        status.innerHTML = '❌ Connection failed: ' + err.message;
        console.error(err);
      });
  </script>
</body>
</html>
```

## Part 6: Deployment Checklist

Before deploying to production, verify:

### Pre-Deploy Checklist (Preview)
- [ ] GCP project created and billing enabled
- [ ] All APIs enabled (Cloud Build, Cloud Run, Artifact Registry, Secret Manager)
- [ ] Artifact Registry repository created
- [ ] Secrets created in Secret Manager
- [ ] Service account created with proper permissions
- [ ] GitHub secret `GCP_CREDENTIALS` added
- [ ] `cloudbuild.yaml` updated with secret mounts
- [ ] Vercel project created and connected to GitHub
- [ ] Vercel environment variables configured for Preview
- [ ] CORS in `server/index.ts` includes Vercel preview origin
- [ ] Dockerfile builds successfully locally
- [ ] Cloud Build test successful

### Post-Deploy Verification (Preview)
- [ ] Cloud Run service deployed successfully
- [ ] `/healthz` endpoint returns 200
- [ ] `/games/:gameId/snapshot` endpoint responds (404 or valid data)
- [ ] WebSocket connection works from browser
- [ ] Vercel preview deployment successful
- [ ] Next.js SSR of `/game/[gameId]` page works
- [ ] Browser logs appear in Cloud Run logs
- [ ] No CORS errors in browser console

### Production Cutover Checklist
- [ ] Custom domain configured in Cloud Run (optional)
- [ ] DNS configured for `simulacra.cc` → Cloud Run
- [ ] Vercel production environment variables set
- [ ] Vercel production domain configured
- [ ] CORS updated for production origins
- [ ] Production secrets verified in Secret Manager
- [ ] Smoke test: create game, join, submit action, reconnect
- [ ] Logs streaming to Loki/Grafana (if enabled)
- [ ] On-call team notified of deployment
- [ ] Rollback plan documented

## Part 7: Monitoring & Troubleshooting

### View Cloud Run Logs

```bash
# Stream logs
gcloud run services logs tail simulacra-preview --region us-central1

# View recent logs
gcloud run services logs read simulacra-preview --region us-central1 --limit 100
```

### Common Issues

**Issue: CORS errors in browser**
- Verify `server/index.ts` CORS allowlist includes Vercel origin
- Check `Access-Control-Allow-Origin` in browser DevTools → Network

**Issue: WebSocket connection fails**
- Verify `NEXT_PUBLIC_COLYSEUS_URL` uses `wss://` (not `ws://`)
- Check Cloud Run allows WebSocket upgrades (it does by default)
- Verify session affinity is enabled

**Issue: Snapshot endpoint returns 404**
- Room might not exist yet (normal if no game created)
- Check `matchMaker.query()` finds the room
- Verify `gameId` filter is working

**Issue: Build fails in Cloud Build**
- Check secret access permissions
- Verify Prisma generates client (`postinstall` script)
- Check `pnpm` version matches lock file

## Part 8: Next Steps (Post-MVP)

After successful MVP deployment:

1. **Add Redis Presence** for multi-instance scaling
2. **Custom domain** for Cloud Run (`colyseus.simulacra.cc`)
3. **CDN** for static assets (Cloudflare/CloudFront)
4. **Monitoring** with Grafana/Loki (see `logging/README.md`)
5. **Alerts** for errors and high latency
6. **Load testing** to verify autoscaling
7. **Database connection pooling** if using Postgres
8. **Rate limiting** on API endpoints

---

**Questions?** See `docs/multiplayer/DEPLOYMENT_STRATEGY.md` for architecture details.
