# Vercel Deployment Guide

Complete guide for deploying Crisis Command to Vercel with Postgres database.

## Prerequisites

- Vercel account (free tier works)
- GitHub repository with your code
- Environment variables ready (API keys, etc.)

## Step 1: Create Vercel Project

### Option A: Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`

### Option B: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

Follow the prompts to link your project.

## Step 2: Add Vercel Postgres

### Via Dashboard

1. In your Vercel project, go to **Storage** tab
2. Click **Create Database**
3. Select **Postgres**
4. Choose a region close to your users
5. Click **Create**

### Via CLI

```bash
vercel env add DATABASE_URL
```

When prompted, select "Postgres" from the database options.

**Important**: Vercel automatically injects `DATABASE_URL` into your project's environment variables. You don't need to manually copy it.

## Step 3: Run Database Migrations

After creating the Postgres database, you need to run Prisma migrations.

### Option A: Via Vercel CLI (Recommended)

```bash
# Link to your Vercel project (if not done already)
vercel link

# Pull environment variables (including DATABASE_URL)
vercel env pull .env.local

# Run migrations using the production DATABASE_URL
npx prisma migrate deploy
```

### Option B: Via GitHub Actions

Create `.github/workflows/migrate.yml`:

```yaml
name: Database Migration

on:
  workflow_dispatch:  # Manual trigger only

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

      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npx prisma migrate deploy
```

Add `DATABASE_URL` to GitHub Secrets, then run the workflow manually.

### Option C: One-time Manual Migration

1. Get your production `DATABASE_URL`:
   ```bash
   vercel env pull .env.production
   cat .env.production | grep DATABASE_URL
   ```

2. Run migration:
   ```bash
   DATABASE_URL="your-production-url" npx prisma migrate deploy
   ```

## Step 4: Configure Environment Variables

### Required Variables

In Vercel Dashboard → Settings → Environment Variables, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Auto-injected by Vercel Postgres | Don't add manually |
| `VITE_LITELLM_API_KEY` | Your LiteLLM API key | Required for LLM calls |
| `VITE_LLM_MODEL` | Model name (e.g., "gpt-4o-mini") | Required for LLM calls |

### Via CLI

```bash
vercel env add VITE_LITELLM_API_KEY production
vercel env add VITE_LLM_MODEL production
```

When prompted, enter the values.

## Step 5: Deploy

### Automatic Deployment (GitHub)

Any push to `main` branch will automatically deploy.

### Manual Deployment

```bash
vercel --prod
```

## Step 6: Verify Deployment

### Check API Route

```bash
curl -X POST https://your-app.vercel.app/api/feedback \
  -H "Content-Type: application/json" \
  -d @api/test-feedback.json
```

Expected response:
```json
{
  "success": true,
  "id": "clxyz123...",
  "message": "Feedback submitted successfully"
}
```

### Check Database

```bash
# Pull production env vars
vercel env pull .env.production

# Open Prisma Studio with production DB
npx prisma studio
```

Or use Vercel Data Browser in the dashboard.

## Troubleshooting

### "DATABASE_URL is not defined"

**Cause**: Prisma Client trying to access database at build time.

**Solution**: Already handled by `postinstall` script in `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

Vercel runs this automatically.

### API Routes Return 404

**Cause**: API routes not detected by Vercel.

**Solution**: Ensure your `api/` folder is in project root and files end with `.ts`.

Check `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

### Migrations Not Applied

**Cause**: Migrations only run when explicitly triggered.

**Solution**: Run `npx prisma migrate deploy` as shown in Step 3.

### Environment Variables Not Working

**Cause**: Variables only available in specified environments.

**Solution**: Add variables to all environments (Production, Preview, Development):
```bash
vercel env add VITE_LITELLM_API_KEY production preview development
```

### Build Fails with "Out of Memory"

**Cause**: Large dependencies or build process.

**Solution**: Enable Pro plan for more build resources, or optimize bundle size.

## Database Connection Pooling

Vercel Postgres automatically uses connection pooling. No additional configuration needed.

If using external Postgres (not Vercel Postgres), use a pooler like PgBouncer:

```bash
# In .env or Vercel env vars
DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true"
```

## Monitoring

### View Logs

```bash
vercel logs --follow
```

Or in Vercel Dashboard → Deployments → [Click deployment] → Functions

### Database Metrics

Vercel Dashboard → Storage → [Your Postgres] → Usage

Monitor:
- Connection count
- Query performance
- Storage usage

## Updating Database Schema

1. Make changes to `prisma/schema.prisma` locally
2. Create migration:
   ```bash
   npx prisma migrate dev --name describe_changes
   ```
3. Commit migration files to Git
4. Push to GitHub (triggers deploy)
5. SSH into Vercel or use CLI to run:
   ```bash
   vercel env pull .env.production
   DATABASE_URL=$(cat .env.production | grep DATABASE_URL | cut -d '=' -f2-) \
     npx prisma migrate deploy
   ```

Or use the GitHub Actions workflow from Step 3.

## Rollback

### Code Rollback

Vercel Dashboard → Deployments → [Previous deployment] → Promote to Production

### Database Rollback

Prisma doesn't support automated rollbacks. Manual process:

1. Restore from Vercel Postgres backup
2. Or manually revert schema changes with new migrations

## Security Best Practices

1. **Never commit** `.env` files
2. **Use environment variables** for all secrets
3. **Enable** Vercel's protection features
4. **Rotate** database credentials periodically
5. **Review** logs for suspicious activity

## Cost Optimization

### Free Tier Limits (Vercel Postgres)

- 256 MB storage
- 60 hours compute per month
- 1 database

### Tips

- Delete old feedback after analysis
- Use `npx prisma migrate reset` in development (careful!)
- Monitor usage in dashboard

## Production Checklist

- [ ] Vercel project created and linked to GitHub
- [ ] Vercel Postgres database created
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] API routes tested in production
- [ ] Feedback form tested end-to-end
- [ ] Monitoring and alerts configured
- [ ] Error tracking set up (optional: Sentry)

## Useful Commands Reference

```bash
# Link to Vercel project
vercel link

# Pull production env vars
vercel env pull .env.production

# Deploy to production
vercel --prod

# View logs
vercel logs

# Run migrations on production
npx prisma migrate deploy

# Open Prisma Studio with production DB
npx prisma studio

# Check deployment status
vercel inspect [deployment-url]
```

## Support

- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [Prisma Deployment Guides](https://www.prisma.io/docs/guides/deployment)
- [Vercel Functions](https://vercel.com/docs/functions)
