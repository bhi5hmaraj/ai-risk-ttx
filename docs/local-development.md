# Local Development Guide

## Quick Start

### 1. Install Dependencies

```bash
npm ci
```

### 2. Set Up Local Database

```bash
npm run db:setup
```

This will:
- Check PostgreSQL is installed and running
- Create `ttx-prisma-postgres-local` database
- Update `.env` with correct `DATABASE_URL`
- Run Prisma migrations

### 3. Configure Environment Variables

Make sure your `.env` file has these variables:

```bash
# Database (auto-configured by db:setup)
DATABASE_URL="postgresql://bhishma@localhost:5432/ttx-prisma-postgres-local?schema=public"

# LLM Configuration (add these manually)
VITE_LITELLM_API_KEY="your-api-key-here"
VITE_LLM_MODEL="gpt-4o-mini"
```

### 4. Start Development Server

```bash
npm run dev
```

This uses **Vercel CLI** (not Vite) to:
- Serve the React frontend
- Run API routes in `/api` directory
- Connect to local PostgreSQL database

**Important:** The dev command now uses `vercel dev` instead of `vite` because the feedback API routes are Vercel serverless functions that need the Vercel runtime to work locally.

If you need plain Vite without API routes, use:
```bash
npm run dev:vite
```

### 5. Test the Feedback API

In a separate terminal (while dev server is running):

```bash
npm run test:api
```

This sends a test POST request to `/api/feedback` and verifies:
- API endpoint responds correctly
- Database connection works
- Data is stored successfully

## Development Workflow

### View Database in Prisma Studio

```bash
npm run db:studio
```

Opens a GUI at http://localhost:5555 to browse and edit data.

### Analyze Feedback Data

```bash
# Basic stats
npm run analyze

# Filter by model
npm run analyze -- --model gpt-4o-mini

# Export to CSV
npm run analyze -- --export feedback.csv
```

See [scripts/README.md](../scripts/README.md) for all options.

### Database Migrations

```bash
# Create a new migration after schema changes
npm run db:migrate

# Reset database (⚠️ deletes all data)
npm run db:reset
```

## How It Works

### Local Development Architecture

```
┌─────────────────────┐
│  Browser            │
│  localhost:3000     │
└──────────┬──────────┘
           │ HTTP
           ▼
┌─────────────────────┐
│  Vercel Dev Server  │
│  (npm run dev)      │
├─────────────────────┤
│  • Vite Frontend    │
│  • API Routes       │
└──────────┬──────────┘
           │ PostgreSQL Protocol
           ▼
┌─────────────────────┐
│  PostgreSQL         │
│  ttx-prisma-postgres│
│  -local             │
└─────────────────────┘
```

### Why Vercel CLI?

The feedback system uses Vercel serverless functions (`/api/feedback.ts`) which require:
- Node.js runtime (not browser)
- Access to `@vercel/node` types
- Environment variables from `.env`
- Prisma client for database access

**Vite dev server** only serves static files and doesn't run serverless functions.

**Vercel dev server** emulates the production environment locally, allowing API routes to work during development.

## Common Issues

### API returns 404

**Cause:** Using `npm run dev:vite` instead of `npm run dev`

**Solution:** Stop the server and restart with:
```bash
npm run dev
```

### Database connection error

**Cause:** PostgreSQL not running or wrong DATABASE_URL

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Re-run setup if needed
npm run db:setup
```

### Prisma Client not found

**Cause:** Prisma client not generated after schema changes

**Solution:**
```bash
npx prisma generate
```

### Permission denied on database

**Cause:** PostgreSQL user not created

**Solution:**
```bash
sudo -u postgres createuser -s $USER
```

## Environment Variables Reference

| Variable | Required | Where | Description |
|----------|----------|-------|-------------|
| `DATABASE_URL` | ✅ Yes | `.env` | PostgreSQL connection string |
| `VITE_LITELLM_API_KEY` | ✅ Yes | `.env` | LiteLLM API key for LLM calls |
| `VITE_LLM_MODEL` | ✅ Yes | `.env` | Model name (e.g., "gpt-4o-mini") |

## Testing Feedback Flow End-to-End

1. **Start dev server**
   ```bash
   npm run dev
   ```

2. **Play a game** in the browser at http://localhost:3000
   - Select a role
   - Start the game
   - Play at least 1 round

3. **Feedback banner appears** after Round 1

4. **Click "Share Your Feedback"**

5. **Fill out the form**
   - Rate 6 aspects (UI, Game Dynamics, etc.)
   - Answer text questions
   - Provide demographics
   - Optional: Email

6. **Submit**

7. **Verify in database**
   ```bash
   npm run db:studio
   ```

   Or via CLI:
   ```bash
   npm run analyze
   ```

8. **Check logs**
   - Vercel dev server terminal shows API request
   - Database insert logged
   - Success response returned to browser

## Next Steps

After verifying locally:
1. Commit changes to a feature branch
2. Push to `preview` branch on GitHub
3. Vercel auto-deploys to preview environment
4. Test on preview URL
5. Merge to `main` for production deployment

See [deployment-setup.md](deployment-setup.md) for Vercel configuration.
