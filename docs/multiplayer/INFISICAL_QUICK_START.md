# Infisical Quick Start (Dynamic SDK)

This setup uses Infisical SDK to fetch secrets **at runtime** - no sync scripts, no GCP Secret Manager duplication.

## Why This Approach?

✅ **Simple** - One source of truth, direct fetching  
✅ **Real-time** - Secret changes are immediately available  
✅ **No sync needed** - Secrets fetched on app startup  
✅ **Resilient** - Falls back to existing env vars if Infisical unavailable

## Setup (5 minutes)

### 1. Create Infisical Account & Project

1. Go to [infisical.com](https://infisical.com)  
2. Sign up (free tier available)  
3. Create a project (e.g., "Simulacra")  
4. Add environments: `development`, `staging`, `production`

### 2. Add Your Secrets to Infisical

Go to each environment and add all your secrets:
- `DATABASE_URL`
- `LITELLM_API_KEY`
- `OPENAI_API_KEY`
- `CLERK_SECRET_KEY`  
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `SENTRY_DSN`

💡 Use consistent names across environments - no prefixes needed!

### 3. Get Service Token (for Cloud Run)

1. Go to Project Settings → Service Tokens
2. Create token for `production` environment
3. Give it **Read** access
4. Copy the token (starts with `st.`)

### 4. Get Project ID (required)

1. Go to Project Settings → General (or Overview)
2. Copy the **Project ID** (UUID)
3. You will set this as `INFISICAL_PROJECT_ID` (not a secret)

### 5. Add Token to GCP Secret Manager

```bash
# Create INFISICAL_TOKEN secret
echo -n "st.your-token-here" | gcloud secrets create INFISICAL_TOKEN --data-file=-

# Grant Cloud Build access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding INFISICAL_TOKEN \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Done! ✅ Cloud Run will now fetch secrets from Infisical at startup.

## How It Works

1. **Server starts** → `server/index.ts` calls `loadSecrets()`
2. **SDK fetches** → Connects to Infisical using `INFISICAL_TOKEN`
3. **Secrets injected** → All secrets added to `process.env`
4. **App runs** → Uses secrets like normal environment variables

## Local Development

For local dev, you have 3 options:

### Option 1: Use .env file (traditional)
```bash
# .env.local
DATABASE_URL=postgres://...
LITELLM_API_KEY=...
# ... other secrets
```

### Option 2: Get personal token from Infisical
```bash
# Create .env.local with just the token
INFISICAL_TOKEN=st.dev.your-token

# Also set project id (required)
INFISICAL_PROJECT_ID=00000000-0000-0000-0000-000000000000

# Server will fetch all other secrets at startup
PORT=3004 pnpm run dev:colyseus
```

### Option 3: Infisical CLI (recommended for teams)
```bash
# Install Infisical CLI
brew install infisical/infisical-cli/infisical

# Login
infisical login

# Run commands with secrets injected
infisical run --env=development -- pnpm run dev:colyseus
```

## Caching

Secrets are cached for 5 minutes by default to reduce Infisical API calls. Configurable in `lib/infisical.ts`.

## Fallback Behavior

If Infisical is unavailable:
- App logs warning
- Continues with existing `process.env` values
- Allows deployment even if Infisical has issues

## Deployment

Already configured! Just push your code:

```bash
git push origin your-branch
```

Cloud Run will:
1. Get `INFISICAL_TOKEN` from GCP Secret Manager
2. Server starts and calls `loadSecrets()`
3. All secrets fetched from Infisical
4. App runs normally

## Updating Secrets

1. Change value in Infisical dashboard
2. Wait 5 minutes (cache TTL) OR restart Cloud Run service
3. New value is used

```bash
# Force restart to pick up new secrets immediately
gcloud run services update simulacra-colyseus-prod --region=us-central1
```

## Troubleshooting

### "No INFISICAL_TOKEN found, skipping secret fetch"

**Fix**: Add `INFISICAL_TOKEN` env var or create service token in Infisical

### Server starts but secrets are wrong

**Fix**: Check you're using the correct environment token (dev/staging/prod)

### "Failed to load secrets from Infisical"

**Fix**: 
- Check token is valid (not expired)
- Verify token has read access to the environment
- Check Infisical API status

## Next Steps

- ✅ Secrets unified in Infisical
- ✅ No more manual .env file management  
- ✅ Real-time updates without redeployment
- ✅ Audit log of who changed what

Enjoy cleaner secret management! 🎉
