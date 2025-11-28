# Scripts

Utility scripts for database setup, testing, and analytics.

## Database Setup

### `setup-local-db.sh`

Automated PostgreSQL setup for local development.

**What it does:**
1. Checks if PostgreSQL is installed and running
2. Creates `ttx-prisma-postgres-local` database
3. Updates `.env` with `DATABASE_URL`
4. Runs Prisma migrations

**Usage:**
```bash
npm run db:setup
```

**Requirements:**
- PostgreSQL 12+ installed
- PostgreSQL service running

**Manual installation:**
```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Arch Linux
sudo pacman -S postgresql
sudo systemctl start postgresql
```

## API Testing

### `test-feedback-api.sh`

Test the feedback API endpoint locally or in production.

**Requirements:**
- For local testing: Run `npm run dev` first (uses Vercel CLI)
- Local UI server URL is controlled by `NEXT_DEV_PORT` (if set), otherwise Next.js default (3000)

**Usage:**
```bash
# Start dev server (in one terminal)
npm run dev

# Test local API (in another terminal)
npm run test:api

# Test production API
npm run test:api -- https://your-app.vercel.app
```

**What it tests:**
- POST /api/feedback endpoint
- Request/response format
- HTTP status codes
- Database connection

**Example output:**
```
🧪 Testing Feedback API
=======================

Testing LOCAL API: http://localhost:3000

Sending test feedback...

Response:
{
  "success": true,
  "id": "clxyz123...",
  "message": "Feedback submitted successfully"
}

HTTP Status: 201

✅ Success! Feedback submitted successfully
```

## Analytics

### `analyze-feedback.ts`

Query and analyze feedback data from the database.

**Basic usage:**
```bash
npm run analyze
```

**Options:**
```bash
# Filter by model
npm run analyze -- --model gpt-4o-mini

# Filter by scenario type
npm run analyze -- --scenario classic

# Filter by completion status
npm run analyze -- --completed true

# Filter by date range
npm run analyze -- --from 2025-01-01 --to 2025-12-31

# Limit results
npm run analyze -- --limit 10

# Show statistics only (no individual entries)
npm run analyze -- --stats

# Export to CSV
npm run analyze -- --export feedback.csv

# Export to JSON
npm run analyze -- --export feedback.json

# Combine filters
npm run analyze -- --model gpt-4 --scenario ai_safety --limit 10 --export results.csv

# Show help
npm run analyze -- --help
```

**Output example:**
```
📊 STATISTICS

Total Feedback Entries: 15
Average Overall Rating: 7.8/10

📈 Rating Breakdown (Average):
  UI:             8.2/10
  Game Dynamics:  7.5/10
  Model Quality:  7.8/10
  Scenario:       8.0/10
  Actions:        7.6/10
  Stakeholders:   7.4/10

🤖 By Model:
  gpt-4o-mini: 10
  gemini-2.5-flash: 5

🎮 By Scenario Type:
  classic: 8
  ai_safety: 5
  custom: 2

✅ Game Completion:
  Completed:   12
  Incomplete:  3
```

**CSV Export format:**
```csv
ID,Date,Model,Scenario,Role,Completed,AvgRating,UI,GameDynamics,ModelQuality,ScenarioRating,Actions,Stakeholders,Improvements
clxyz123,2025-10-14T22:45:00Z,gpt-4o-mini,classic,Tech CEO,Yes,7.8,8,7,8,8,7,7,"More scenarios needed"
```

**Use cases:**
- Track feedback trends over time
- Compare model performance
- Identify areas for improvement
- Export data for external analysis
- Generate reports for stakeholders

## Environment Setup

All scripts respect these environment variables:

```bash
DATABASE_URL          # PostgreSQL connection string
NODE_ENV             # development/production
```

**Local development:**
```bash
# Automatically set by npm run db:setup
DATABASE_URL="postgresql://username@localhost:5432/ttx-prisma-postgres-local?schema=public"
```

**Production:**
```bash
# Use Vercel env vars
vercel env pull .env.production
npm run analyze
```

## Troubleshooting

### PostgreSQL not found

**Error:**
```
❌ PostgreSQL is not installed
```

**Solution:** Install PostgreSQL using your package manager (see setup-local-db.sh)

### PostgreSQL service not running

**Error:**
```
⚠ PostgreSQL service is not running
```

**Solution:**
```bash
# macOS
brew services start postgresql@16

# Linux
sudo systemctl start postgresql
```

### Database connection failed

**Error:**
```
❌ Error querying database: connection refused
```

**Solution:**
1. Check `DATABASE_URL` in `.env`
2. Verify PostgreSQL is running: `pg_isready`
3. Test connection: `psql $DATABASE_URL`

### Permission denied

**Error:**
```
permission denied for database
```

**Solution:**
```bash
# Create user with permissions
createuser -s $USER

# Or grant permissions
psql -c "GRANT ALL PRIVILEGES ON DATABASE ttx-prisma-postgres-local TO $USER"
```

### Migration errors

**Error:**
```
Migration failed: relation already exists
```

**Solution:**
```bash
# Reset database (⚠️ deletes all data)
npm run db:reset

# Re-run setup
npm run db:setup
```

## Advanced Usage

### Custom database name

Edit `setup-local-db.sh`:
```bash
DB_NAME="my_custom_db"
```

### Connect to remote database

Update `.env`:
```bash
DATABASE_URL="postgresql://user:pass@remote-host:5432/dbname"
```

### Query raw SQL

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Feedback\""
```

### Backup database

```bash
pg_dump $DATABASE_URL > backup.sql
```

### Restore database

```bash
psql $DATABASE_URL < backup.sql
```

## Continuous Integration

### GitHub Actions example

```yaml
name: Analytics Report

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  analytics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run analyze -- --export weekly-report.csv
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - uses: actions/upload-artifact@v3
        with:
          name: analytics-report
          path: weekly-report.csv
```

## See Also

- [Prisma README](../prisma/README.md) - Database schema documentation
- [Vercel Deployment](../docs/vercel-deployment.md) - Production setup
- [Feedback Data Collection](../docs/feedback-data-collection.md) - How data is collected
