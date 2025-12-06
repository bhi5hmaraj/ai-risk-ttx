# Infisical Migration Checklist

Clean migration from Vercel to Infisical with normalized secret names.

## Philosophy

- **No environment prefixes** in secret names (Infisical handles this via environments)
- **Same secrets in all environments** (values differ, not keys)
- **Clean slate**: Fix Vercel's quirks and inconsistencies

## Step 1: Create Infisical Account & Project

- [ ] Go to [infisical.com](https://infisical.com) and sign up
- [ ] Create a new project (suggested name: "Simulacra" or "AI Risk TTX")
- [ ] Create three environments:
  - `production` (for production deployments)
  - `staging` (for preview/staging deployments)
  - `development` (for local development)

## Step 2: Add Normalized Secrets to Infisical

**All environments get the SAME keys** - only values differ per environment.

**IMPORTANT**: This step is split into two sections:
- **MUST add**: Actual secrets (credentials/tokens) - ~10 secrets
- **OPTIONAL**: Configuration values (URLs/flags) - ~11 values

You can add the configuration values to Infisical for centralized management, OR just put them in `.env.local` / deployment platform environment variables.

### Part A: Actual Secrets (MUST add to Infisical)

These contain sensitive credentials that must be kept private.

#### Authentication & Authorization

Add to **all three environments** (production, staging, development):

| Secret Key | Production Value | Staging Value | Development Value |
|------------|-----------------|---------------|-------------------|
| `CLERK_SECRET_KEY` | (from Vercel Production) | (from Vercel Preview) | (from Vercel Production or create dev key) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | (from Vercel Production) | (from Vercel Preview) | (from Vercel Production or create dev key) |
| `ADMIN_EMAILS` | matib275@gmail.com,alishapathak23@gmail.com | matib275@gmail.com,alishapathak23@gmail.com | Your local email |

#### Database Credentials

Add to **all three environments**:

| Secret Key | Production Value | Staging Value | Development Value |
|------------|-----------------|---------------|-------------------|
| `DATABASE_URL` | Production DB URL | Preview/Staging DB URL | `postgresql://bhishma@localhost:5432/ttx-prisma-postgres-local?schema=public` |
| `POSTGRES_URL` | Production Postgres URL | Preview Postgres URL | Local Postgres URL |
| `PRISMA_DATABASE_URL` | Production Prisma URL | Preview Prisma URL | Local Prisma URL |
| `DIRECT_DATABASE_URL` | Production Direct URL | Preview Direct URL | Local Direct URL |

**Note**: Get Production/Staging values from Vercel dashboard. Remove `PREVIEW_DB_*` prefixes - they're Vercel quirks we don't need.

#### Redis Session Store

Add to **all three environments**:

| Secret Key | Production Value | Staging Value | Development Value |
|------------|-----------------|---------------|-------------------|
| `UPSTASH_REDIS_REST_TOKEN` | (from Vercel) | (from Vercel) | (from Vercel or local Redis token) |
| `REDIS_URL` | (from Vercel) | (from Vercel) | (from Vercel or local Redis) |

#### LLM API Credentials

Add to **all three environments**:

| Secret Key | Production Value | Staging Value | Development Value |
|------------|-----------------|---------------|-------------------|
| `LITELLM_API_KEY` | (from Vercel) | (from Vercel) | (from .env.local) |

---

### Part B: Configuration Values (OPTIONAL - can use .env.local instead)

These are URLs, flags, and model names. They're not sensitive, so you can:
- Add them to Infisical for centralized management, OR
- Just put them in `.env.local` / deployment platform environment variables

#### Redis Configuration

| Config Key | Production Value | Staging Value | Development Value |
|------------|-----------------|---------------|-------------------|
| `UPSTASH_REDIS_REST_URL` | (from Vercel) | (from Vercel) | https://well-goshawk-35908.upstash.io |
| `SESSION_STORE_TYPE` | `redis` | `redis` | `redis` |

#### LLM Configuration

| Config Key | Production Value | Staging Value | Development Value |
|------------|-----------------|---------------|-------------------|
| `LITELLM_BASE_URL` | `https://asgard.bhishmaraj.org` | `https://asgard.bhishmaraj.org` | `https://asgard.bhishmaraj.org` |
| `LLM_MODEL` | `gemini-2.5-flash-lite` | `gemini-2.5-flash-lite` | `gemini-2.5-flash-lite` |
| `NEXT_PUBLIC_LLM_MODEL` | `gemini-2.5-flash-lite` | `gemini-2.5-flash-lite` | `gemini-2.5-flash-lite` |

#### Debug & Feature Flags

| Config Key | Production Value | Staging Value | Development Value |
|------------|-----------------|---------------|-------------------|
| `DEBUG_API` | `0` | `1` | `1` |
| `NEXT_PUBLIC_BACKEND_STATE` | `1` | `1` | `1` |

---

### Legacy Auth (Skip if using Clerk)

Add to **all three environments** (only if still using NextAuth):

| Secret Key | Production Value | Staging Value | Development Value |
|------------|-----------------|---------------|-------------------|
| `AUTH_SECRET` | (from Vercel Preview) | (from Vercel Preview) | Generate new secret |
| `NEXTAUTH_SECRET` | (from Vercel Preview) | (from Vercel Preview) | Generate new secret |
| `NEXTAUTH_URL` | Your production URL | Your staging URL | `http://localhost:3000` |
| `ADMIN_PASSWORD_1` | (from Vercel Preview if needed) | (from Vercel Preview if needed) | (set local password) |

**Note**: If you've fully migrated to Clerk, skip these entirely.

## Secrets NOT to Add (Platform-Managed)

These are set automatically by deployment platforms - **DO NOT** add to Infisical:

- `NEXT_PUBLIC_APP_URL` - Set by Vercel or Cloud Run
- `NEXT_PUBLIC_COLYSEUS_URL` - Set by Cloud Run deployment
- `NEXT_PUBLIC_COLYSEUS_HTTP_BASE` - Set by Cloud Run deployment
- `NODE_ENV` - Automatically set to `production`, `development`, etc.
- `PORT` - Set by Cloud Run
- `VERCEL_*` - Vercel internal variables
- `BRANCH_NAME` - Set by Cloud Build

## Step 3: Create Service Tokens

You need **3 service tokens** (one per environment):

### Production Token
- [ ] Go to Project Settings → Service Tokens in Infisical
- [ ] Click "Create Service Token"
- [ ] Name: `production-token`
- [ ] Environment: `production`
- [ ] Permissions: **Read** access
- [ ] Copy the token (starts with `st.`)
- [ ] Save somewhere secure

### Staging Token
- [ ] Create Service Token
- [ ] Name: `staging-token`
- [ ] Environment: `staging`
- [ ] Permissions: **Read** access
- [ ] Copy the token
- [ ] Save somewhere secure

### Development Token
- [ ] Create Service Token
- [ ] Name: `development-token`
- [ ] Environment: `development`
- [ ] Permissions: **Read** access
- [ ] Copy the token
- [ ] Save somewhere secure

## Step 4: Configure Vercel

### Add INFISICAL_TOKEN to Vercel

- [ ] Go to Vercel dashboard → Your Project → Settings → Environment Variables
- [ ] Add **Production** token:
  - **Name:** `INFISICAL_TOKEN`
  - **Value:** (paste production token)
  - **Environments:** ✓ Production only
  - Click "Save"

- [ ] Add **Staging** token:
  - **Name:** `INFISICAL_TOKEN`
  - **Value:** (paste staging token)
  - **Environments:** ✓ Preview only
  - Click "Save"

- [ ] Add **Development** token:
  - **Name:** `INFISICAL_TOKEN`
  - **Value:** (paste development token)
  - **Environments:** ✓ Development only
  - Click "Save"

### Verify instrumentation.ts is configured

- [ ] Check that `instrumentation.ts` exists in your repo root
- [ ] It should call `loadSecrets()` from `lib/infisical.ts`

## Step 5: Configure Google Cloud Run (Colyseus)

### Add INFISICAL_TOKEN to GCP Secret Manager

For production deployments:

```bash
# Create production token secret
echo -n "st.your-production-token-here" | gcloud secrets create INFISICAL_TOKEN --data-file=-

# Grant Cloud Build access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding INFISICAL_TOKEN \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding INFISICAL_TOKEN \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

- [ ] Executed the above commands
- [ ] Verify secret exists: `gcloud secrets list | grep INFISICAL`

### For Staging/Preview Deployments (Optional)

If you want feature branch deployments to use staging secrets:

```bash
# Create staging token secret
echo -n "st.your-staging-token-here" | gcloud secrets create INFISICAL_TOKEN_STAGING --data-file=-

# Grant access
gcloud secrets add-iam-policy-binding INFISICAL_TOKEN_STAGING \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding INFISICAL_TOKEN_STAGING \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Then update `cloudbuild.yaml` to use `INFISICAL_TOKEN_STAGING` for non-main branches.

- [ ] Created staging token in GCP (if needed)

## Step 6: Local Development Setup

### Option A: Add INFISICAL_TOKEN to .env.local (Simple)

```bash
# Edit .env.local - keep only:
INFISICAL_TOKEN=st.dev.your-development-token-here
NODE_ENV=development

# Remove all other secrets - they'll be fetched from Infisical
```

- [ ] Added `INFISICAL_TOKEN` to `.env.local`
- [ ] Removed other secrets from `.env.local`

### Option B: Use Infisical CLI (Recommended)

```bash
# Install CLI (macOS)
brew install infisical/infisical-cli/infisical

# Or Linux
curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash
sudo apt-get update && sudo apt-get install -y infisical

# Login
infisical login

# Run commands with secrets injected
infisical run --env=development -- pnpm run dev
infisical run --env=development -- PORT=3004 pnpm run dev:colyseus
```

- [ ] Installed Infisical CLI
- [ ] Logged in to Infisical
- [ ] Tested running dev server with `infisical run`

## Step 7: Test the Integration

### Test Vercel (Next.js)

- [ ] Trigger a new deployment (push to main branch)
- [ ] Check deployment logs for: `[Infisical] Loaded X secrets`
- [ ] Verify production app works
- [ ] Check browser console for no missing env var errors

- [ ] Push to a feature branch
- [ ] Check preview deployment uses staging secrets
- [ ] Verify preview app works

### Test Cloud Run (Colyseus)

- [ ] Deploy Colyseus: `git push origin main`
- [ ] Check Cloud Build logs: https://console.cloud.google.com/cloud-build
- [ ] Check Cloud Run logs for: `[Infisical] Loaded X secrets`
- [ ] Verify Colyseus server starts successfully
- [ ] Test WebSocket connection

### Test Local Development

With .env.local:
```bash
pnpm run dev
```

With Infisical CLI:
```bash
infisical run --env=development -- pnpm run dev
```

- [ ] Local dev server starts without errors
- [ ] Secrets are loaded (check console for: `[Infisical] Loaded X secrets`)
- [ ] All features work: auth, database, LLM calls, Redis sessions

## Step 8: Cleanup Vercel Environment Variables

**⚠️ WARNING: Only do this after thoroughly testing all deployments!**

Once you've confirmed everything works with Infisical for at least a week:

### Keep Only INFISICAL_TOKEN in Vercel

- [ ] Go to Vercel → Project Settings → Environment Variables
- [ ] For each environment (Production, Preview, Development):
  - **KEEP:** `INFISICAL_TOKEN` (the only secret you need!)
  - **DELETE:** All other secrets (they're now in Infisical)

### Verify After Cleanup

- [ ] Trigger new production deployment
- [ ] Trigger new preview deployment
- [ ] Both should work with only `INFISICAL_TOKEN` in Vercel

## Step 9: Update Documentation

- [ ] Update `.env.example` to show new simplified approach:
  ```bash
  # New approach: Only INFISICAL_TOKEN needed
  INFISICAL_TOKEN=st.dev.your-token-here
  NODE_ENV=development
  ```

- [ ] Add note to README about Infisical setup
- [ ] Update team documentation

## Normalized Secret Summary

Total variables per environment: **~18 keys** (same across all environments)

### Actual Secrets (MUST add to Infisical) - ~10 keys
**These contain sensitive credentials:**
- Database connection strings (4 variants with credentials)
- Auth tokens (Clerk secret keys)
- Admin emails (ADMIN_EMAILS)
- Redis tokens (UPSTASH_REDIS_REST_TOKEN, REDIS_URL)
- LLM API key (LITELLM_API_KEY)

### Configuration Values (OPTIONAL) - ~8 keys
**These are URLs, flags, and model names (not sensitive):**
- URLs: `LITELLM_BASE_URL`, `UPSTASH_REDIS_REST_URL`
- Model names: `LLM_MODEL`, `NEXT_PUBLIC_LLM_MODEL`
- Feature flags: `SESSION_STORE_TYPE`, `DEBUG_API`, `NEXT_PUBLIC_BACKEND_STATE`

**You can add config values to Infisical for centralized management, OR just use .env.local / deployment platform.**

### Removed Prefixes
- ❌ `PREVIEW_DB_*` → ✅ Just use standard names in staging environment
- ❌ `NEXTAUTH_*` (if migrated to Clerk) → ✅ Removed entirely
- ❌ Environment-specific naming → ✅ Same keys, different values per env

## Benefits of This Approach

✅ **Clean naming** - No prefixes, just environment selection
✅ **Consistency** - Same keys in all environments
✅ **Easy migration** - Production → Staging → Dev use same structure
✅ **Infisical-native** - Leverage proper environment management
✅ **Simpler deploys** - One token, all secrets fetched automatically
✅ **Audit trail** - Who changed what, when
✅ **Real-time updates** - Change secrets without redeploying (5min cache)

## Troubleshooting

### "No INFISICAL_TOKEN found"

**Fix:**
- Verify token exists in Vercel env vars for the correct environment
- Check token exists in GCP Secret Manager
- Verify `.env.local` has token for local dev

### "Failed to load secrets from Infisical"

**Check:**
1. Token is valid (not expired)
2. Token has read access to the environment
3. Infisical API status: https://status.infisical.com
4. `NODE_ENV` matches the environment (production/development)

### Wrong environment loaded

**Fix:**
The `loadSecrets()` function uses `NODE_ENV` to determine which environment to fetch:
- Production: `NODE_ENV=production` → loads from Infisical `production`
- Development: `NODE_ENV=development` → loads from Infisical `development`
- Staging: We map this to `NODE_ENV=production` in Vercel preview but use staging token

### Secrets are stale/not updating

**Fix:**
Secrets are cached for 5 minutes. To force refresh:
- Restart the service (Vercel redeploy, Cloud Run restart, or kill local dev server)

## Migration Complete! 🎉

Your secrets are now:
- ✅ Normalized with clean naming (no environment prefixes)
- ✅ Same keys across all environments (only values differ)
- ✅ Centralized in Infisical
- ✅ Auto-fetched at runtime
- ✅ No manual .env file management needed

Next steps: Monitor your deployments and enjoy unified, clean secret management!
