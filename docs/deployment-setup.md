# Deployment Setup

Configuration for Crisis Command deployment on Vercel.

## Database Configuration

| Environment | Database Name | Branch | Purpose |
|-------------|--------------|--------|---------|
| **Production** | `ttx-prisma-postgres` | `main` | Live user data |
| **Preview** | `ttx-prisma-postgres-preview` | `preview` | Testing on Vercel |
| **Local** | `crisis_command_dev` | N/A | Local development |

## Vercel Configuration

**Production Branch**: `main`
- Deploys to production: https://crisis-command.vercel.app
- Uses `ttx-prisma-postgres` database

**Preview Branch**: `preview`
- Deploys to preview URL: https://crisis-command-git-preview-{team}.vercel.app
- Uses `ttx-prisma-postgres-preview` database
- For testing before merging to `main`

## Setup Steps

### 1. Create Preview Database

You already have `ttx-prisma-postgres` for production. Create the preview database:

1. Go to [Vercel Dashboard → Storage](https://vercel.com/dashboard/stores)
2. Click "Create Database"
3. Select "Postgres"
4. **Name**: `ttx-prisma-postgres-preview`
5. Choose same region as `ttx-prisma-postgres`
6. Click "Create"

### 2. Link Databases to Environments

#### Production Database (main branch)

1. Go to Storage → `ttx-prisma-postgres`
2. Click "Connect"
3. Select your project
4. **Important**: Select only **Production** environment
5. Click "Connect"

This automatically adds `DATABASE_URL` to production environment.

#### Preview Database (preview branch)

1. Go to Storage → `ttx-prisma-postgres-preview`
2. Click "Connect"
3. Select your project
4. **Important**: Select only **Preview** environment
5. Click "Connect"

This automatically adds `DATABASE_URL` to preview environment.

### 3. Set Other Environment Variables

Go to Vercel Dashboard → Settings → Environment Variables

Add these to **both** Production and Preview:

| Variable | Value | Environments |
|----------|-------|--------------|
| `VITE_LITELLM_API_KEY` | Your API key | ✅ Production, ✅ Preview |
| `VITE_LLM_MODEL` | `gpt-4o-mini` | ✅ Production, ✅ Preview |

### 4. Run Database Migrations

#### Production Database (main branch)

```bash
# Pull production env vars
vercel env pull .env.production

# Run migrations on production DB
npx prisma migrate deploy
```

#### Preview Database (preview branch)

```bash
# Pull preview env vars
vercel env pull .env.preview

# Run migrations on preview DB
DATABASE_URL=$(grep DATABASE_URL .env.preview | cut -d '=' -f2-) \
  npx prisma migrate deploy
```

### 5. Verify Configuration

```bash
# Check production uses ttx-prisma-postgres
vercel env pull .env.production
grep DATABASE_URL .env.production
# Should contain: ttx-prisma-postgres (not preview)

# Check preview uses ttx-prisma-postgres-preview
vercel env pull .env.preview
grep DATABASE_URL .env.preview
# Should contain: ttx-prisma-postgres-preview
```

## Git Workflow

### Branch Strategy

```
main (production)
  ↑
  └── Pull Request (review & test)
        ↑
        └── preview (testing branch on Vercel)
              ↑
              └── feature/branch (local development)
```

### Development Workflow

```bash
# 1. Create feature branch from preview
git checkout preview
git pull origin preview
git checkout -b feature/my-feature

# 2. Develop locally
npm run dev  # Uses local database (crisis_command_dev)

# 3. Push feature branch
git push origin feature/my-feature
# This creates a preview deployment but uses preview DB

# 4. Merge feature → preview branch for Vercel testing
git checkout preview
git merge feature/my-feature
git push origin preview
# ✅ Deploys to Vercel preview URL
# ✅ Uses ttx-prisma-postgres-preview database

# 5. Test on preview deployment
# Visit: https://crisis-command-git-preview-{team}.vercel.app
# Submit test feedback → goes to preview DB

# 6. When ready, create PR: preview → main
# Review changes on GitHub

# 7. Merge to production
git checkout main
git merge preview
git push origin main
# ✅ Deploys to production
# ✅ Uses ttx-prisma-postgres database
```

### Quick Commands

```bash
# Deploy to preview (testing)
git checkout preview
git merge feature/my-feature
git push origin preview

# Deploy to production
git checkout main
git merge preview
git push origin main
```

## Database Management

### View Production Data (main branch)

```bash
vercel env pull .env.production
npx prisma studio
# Opens Prisma Studio with ttx-prisma-postgres
```

### View Preview Data (preview branch)

```bash
vercel env pull .env.preview
DATABASE_URL=$(grep DATABASE_URL .env.preview | cut -d '=' -f2-) \
  npx prisma studio
# Opens Prisma Studio with ttx-prisma-postgres-preview
```

### Run Analytics

```bash
# Production analytics
vercel env pull .env.production
npm run analyze

# Preview analytics (test data)
vercel env pull .env.preview
DATABASE_URL=$(grep DATABASE_URL .env.preview | cut -d '=' -f2-) \
  npm run analyze
```

### Reset Preview Database

When you want to clear test data:

```bash
vercel env pull .env.preview
DATABASE_URL=$(grep DATABASE_URL .env.preview | cut -d '=' -f2-) \
  npx prisma migrate reset
```

⚠️ **Never run reset on production!**

## Branch Protection

### Protect Main Branch (Production)

GitHub → Settings → Branches → Add rule

**Branch name pattern**: `main`

Settings:
- ✅ Require a pull request before merging
  - ✅ Require approvals: 1
- ✅ Require status checks to pass before merging
  - Select: Vercel deployment
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings

### Protect Preview Branch (Optional)

**Branch name pattern**: `preview`

Settings:
- ✅ Require a pull request before merging (optional)
- ✅ Require status checks to pass before merging

## Automated Migrations (Optional)

### For Preview Branch

Create `.github/workflows/migrate-preview.yml`:

```yaml
name: Migrate Preview Database

on:
  push:
    branches:
      - preview

jobs:
  migrate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run preview migrations
        env:
          DATABASE_URL: ${{ secrets.PREVIEW_DATABASE_URL }}
        run: npx prisma migrate deploy
```

**Setup:**
1. Get preview `DATABASE_URL`: `vercel env pull .env.preview`
2. Copy the `DATABASE_URL` value
3. GitHub → Settings → Secrets → Actions → New secret
4. Name: `PREVIEW_DATABASE_URL`
5. Paste the value

### For Production Branch

Create `.github/workflows/migrate-production.yml`:

```yaml
name: Migrate Production Database

on:
  push:
    branches:
      - main

jobs:
  migrate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run production migrations
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
        run: npx prisma migrate deploy
```

**Setup:**
1. Get production `DATABASE_URL`: `vercel env pull .env.production`
2. Add to GitHub Secrets as `PRODUCTION_DATABASE_URL`

## Testing Flow

### Before Deploying to Production

1. **Develop locally**
   ```bash
   git checkout -b feature/my-feature
   npm run dev  # Test locally
   ```

2. **Push to preview branch**
   ```bash
   git checkout preview
   git merge feature/my-feature
   git push origin preview
   ```

3. **Test on Vercel preview**
   - Visit preview URL
   - Submit test feedback
   - Check preview database: `npm run analyze`
   - Verify everything works

4. **Deploy to production**
   ```bash
   git checkout main
   git merge preview
   git push origin main
   ```

## Troubleshooting

### Wrong database being used

**Check which DATABASE_URL is set:**

```bash
# Production should use ttx-prisma-postgres
vercel env pull .env.production
grep DATABASE_URL .env.production

# Preview should use ttx-prisma-postgres-preview
vercel env pull .env.preview
grep DATABASE_URL .env.preview
```

**Fix**: Vercel Dashboard → Settings → Environment Variables
- Click on `DATABASE_URL`
- Verify it's scoped to the correct environment

### Preview deployment uses production database

**Cause**: Database linked to wrong environment.

**Solution**:
1. Storage → `ttx-prisma-postgres-preview` → Disconnect
2. Reconnect and select **only Preview** environment

### Migrations not applied

**Solution**:
```bash
# For preview
vercel env pull .env.preview
DATABASE_URL=$(grep DATABASE_URL .env.preview | cut -d '=' -f2-) \
  npx prisma migrate deploy

# For production
vercel env pull .env.production
npx prisma migrate deploy
```

### How to tell which database I'm connected to

Add temporary logging to API route:

```typescript
// api/feedback.ts
console.log('DB:', process.env.DATABASE_URL?.includes('preview') ? 'PREVIEW' : 'PRODUCTION');
```

Check Vercel logs:
```bash
vercel logs
```

## Summary

Your setup:
- ✅ `main` branch → Production → `ttx-prisma-postgres`
- ✅ `preview` branch → Preview/Testing → `ttx-prisma-postgres-preview`
- ✅ Local dev → Local PostgreSQL → `crisis_command_dev`

Workflow:
1. Develop on feature branches locally
2. Merge to `preview` branch for Vercel testing
3. Test thoroughly on preview deployment
4. Merge `preview` → `main` for production release

This gives you safe testing before production! 🚀
